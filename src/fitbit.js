import Cloudant from "./cloudant.js";
import request from "request-promise";
import async from "async";
import { logger } from "./logger";

const MAX_RETRY = 5;
const FITBIT_CLIENT_ID = process.env.FITBIT_CLIENT_ID;
const FITBIT_CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET;
const FITBIT_CLIENT_SECRET_64 = new Buffer(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString("base64");
const db = new Cloudant();
const rp = request.defaults({
    resolveWithFullResponse: true, // A boolean to set whether the promise should be resolved with the full response or just the response body.
    simple: false, // A boolean to set whether status codes other than 2xx should also reject the promise.
    transform: (body, response, resolveWithFullResponse) =>  { // eslint-disable-line
        return  { statusCode: response.statusCode, headers: response.headers , data: JSON.parse(body) } ;
    }
});

/**
 * Represents a FitBit
 */
export default class FitBit {

    /**
     * Get user's steps for the day.
     * @param {string} task The task that fitbit subscription provides.
     * @param {string} user The user's doc from cloudant.
     * @returns {Object} The daily steps for the requested user.
     */
    async getSteps(task, user) {
        try {
            let results = await rp({
                url: `https://api.fitbit.com/1/user/${task.ownerId}/activities/steps/date/${task.date}/${task.date}.json`,
                headers: {
                    "Authorization": `Bearer  ${user.access_token}`
                },
            });

            if(results.statusCode == 200) {
                return results.data["activities-steps"];
            } else if (results.statusCode == 401) {
                let refresh_status = await this.refreshTokens(user);
                return { statusCode: 401, error: refresh_status.data.errors };
            }
        } catch(err) {
            logger.log("error",`Error occured getting steps from fitbit api: ${JSON.stringify(err,null,4)}`);
        }
    }

    /**
     * Get user's steps for the day.
     * @param {string} task The task that fitbit subscription provides.
     * @param {string} user The user's doc from cloudant.
     * @returns {Object} The daily body_mass for the requested user.
     */
    async getMass(task, user) {
        try {
            let results = await rp({
                url: `https://api.fitbit.com/1/user/${task.ownerId}/body/log/weight/date/${task.date}/${task.date}.json`,
                headers: {
                    "Authorization": `Bearer  ${user.access_token}`
                },
            });

            if(results.statusCode == 200) {
                return results.data["weight"];
            } else if (results.statusCode == 401) {
                let refresh_status = await this.refreshTokens(user);
                return { statusCode: 401, error: refresh_status.data.errors };
            }
        } catch(err) {
            logger.log("error",`Error occured getting mass from fitbit api: ${JSON.stringify(err,null,4)}`);
        }
    }

    /**
     *  Refresh a user's accessn token and save to the database.
     * @param {Object} user A user object contains refresh_token.
     * @returns {void}
     */
    async refreshTokens(user) {

        try {
            let refreshed_ua_token = await rp({
                uri: "https://api.fitbit.com/oauth2/token",
                method: "POST",
                headers: {
                    "Authorization": `Basic ${FITBIT_CLIENT_SECRET_64}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                form: {"grant_type": "refresh_token", "refresh_token": user.refresh_token}
            });

            if (refreshed_ua_token.statusCode != 200) {
                return refreshed_ua_token;
            }

            // Parse response and update user's doc
            user.refresh_token = refreshed_ua_token.data.refresh_token;
            user.access_token = refreshed_ua_token.data.access_token;

            // Insert updated user doc into cloudant.
            let updated_user = await db.addUser(user);
            if(!updated_user.ok) {
                logger.log("error","There was an issue updating a user's doc in cloudant..");
            } else {
                logger.log("info", `Refreshed user ${user.fitbit_id}'s access_token and refresh_token.'`);
            }
            return refreshed_ua_token;

        } catch(err) {
            logger.log("error", `Error refreshing tokens for user ${JSON.stringify(err,null,4)}`);
        }
    }

    /**
     * Get user's steps for the day.
     * @param {Object} user The user which needs to be revoked.
     * @returns {void}
     */
    async revokeAccess(user) {
        try {
            await request({
                url: `https://api.fitbit.com/1/user/-/apiSubscriptions/${user.fitbit_id}.json`,
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${user.access_token}`
                }
            });

            await request({
                url: "https://api.fitbit.com/oauth2/revoke",
                headers: {
                    "Authorization": `Basic ${FITBIT_CLIENT_SECRET_64}`
                },
                qs: { "token": user.access_token }
            });

            logger.log("info", `Subscription and user's access has been deleted for user ${user.fitbit_id}`);
        } catch(err) {
            logger.log("error",`Error occured revoking access from fitbit api: ${JSON.stringify(err,null,4)}`);
        }
    }

    /**
     * Process weight for the day
     * @param {string} task A notification that a user's weight has changed.
     * @param {function} cb A callback for when the task is done
     * @returns {void}
     */
    async processMass(task, cb) {
        let user = await db.getUser({ "selector" : { "fitbit_id": task.ownerId } });
        user = user.docs[0];
        let user_mass = await this.getMass(task, user);

        // Check to see if fitbit api returned 400 or 401
        // If retries has reached the maximum attempts then drop from queue and
        // post error to console. Otherwise send task to the end of the queue and
        // increase retry attempts
        if (user_mass.statusCode == 400 || user_mass.statusCode == 401) {
            if (task.retry < MAX_RETRY) {
                task.retry++;
                queue.push(task, (err, message) => {
                    if (err) logger.log("error",`There was an error processing the task: ${JSON.stringify(err, "", 4)}`);
                    if (message) logger.log("info",message);
                });
                return cb(null, `Retry #${task.retry}: ${task.collectionType} pull for user ${task.ownerId} on ${task.date}.`);
            } else {
                return cb({
                    statusCode: user_mass.statusCode,
                    message: `User ${task.ownerId} has hit the ${MAX_RETRY} max attempts..`,
                    error: user_mass.error
                },
                null);
            }

        } else if (user_mass.length == 0){
            return cb(null,`Fitbit API has returned no data for ${task.ownerId} user on ${task.date}.`);
        }

        user_mass = user_mass[0];

        // Check to see if weight exists for that day.
        let massExists = await db.getMass({ "selector": { "fitbit_id": task.ownerId, "date": task.date} });
        if (massExists.length > 0) {
            massExists = massExists[0];
            if(massExists["body_mass"] != user_mass.weight) {
                massExists["body_mass"] = user_mass.weight;
                await db.insertMass(massExists);
            }
        } else {
            await db.insertMass({
                body_mass: user_mass.weight,
                name: user.name,
                fitbit_id: task.ownerId,
                date: task.date
            });
        }
        return cb(null, `Successfully updated mass for Fitbit user: ${task.ownerId} on ${task.date}`);
    }

    /**
     * Process steps for the day
     * @param {string} task A notification that a user's steps has changed.
     * @param {function} cb A callback for when the task is done
     * @returns {void}
     */
    async processSteps(task, cb) {
        // Gets user's data from cloudant
        let user = await db.getUser({ "selector" : { "fitbit_id": task.ownerId } }).catch(e => logger.log("error", `Error getting user: ${e, "", 4}`));
        user = user.docs[0];

        // Call Fitbit's api to process task for a given user.
        let user_steps = await this.getSteps(task, user);

        // Check to see if fitbit api returned 400 or 401
        // If retries has reached the maximum attempts then drop from queue and
        // post error to console. Otherwise send task to the end of the queue and
        // increase retry attempts.
        if (user_steps.statusCode == 400 || user_steps.statusCode == 401) {
            if (task.retry < MAX_RETRY) {
                task.retry++;
                queue.push(task, (err, message) => {
                    if (err) logger.log("error",`There was an error processing the task: ${JSON.stringify(err, "", 4)}`);
                    if (message) logger.log("info",message);
                });
                return cb(null, `Retry #${task.retry}: ${task.collectionType} pull for user ${task.ownerId} on ${task.date}`);
            } else {
                return cb({
                    statusCode: user_steps.statusCode,
                    message: `User ${task.ownerId} has hit the ${MAX_RETRY} max attempts..`,
                    error: user_steps.error
                },
                null);
            }

        }
        user_steps = user_steps[0];

        // Check to see if steps exist for that day.
        let stepsExists = await db.getSteps({ "selector": { "fitbit_id": task.ownerId, "date": task.date} });
        if (stepsExists.length > 0) {
            stepsExists = stepsExists[0];
            if(stepsExists["steps"] != user_steps.value) {
                stepsExists["steps"] = user_steps.value;
                await db.insertSteps(stepsExists);
            }
        } else {
            await db.insertSteps({
                steps: user_steps.value,
                name:  user.name,
                fitbit_id: task.ownerId,
                date: task.date
            });
        }
        return cb(null, `Successfully updated steps for Fitbit user: ${task.ownerId} on ${task.date}`);
    }
}

const fb = new FitBit();
// Create queue to handle notifications
export const queue = async.queue(function(task, cb) {
    task.retry = task.retry || 0;
    // Exponentially increase timeout based on retry attempts.
    let timeout = 3000 * Math.pow(2, task.retry);
    logger.log("debug", `Sleeping for ${timeout / 1000} seconds`);
    setTimeout(function() {
        if( task.collectionType == "body") {
            fb.processMass(task, cb);
        } else if (task.collectionType == "activities") {
            fb.processSteps(task,cb);
        } else{
            cb();
        }
    },timeout);
}, 1);

queue.drain = (err) => {
    if(err) logger.log("error"`Emptying queue failed - ${err, "", 4}`);
    logger.log("debug","Successfully emptied queue..");
};
