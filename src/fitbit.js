import Cloudant from "./cloudant.js";
import request from "request-promise";
import { logger } from "./logger";

const db = new Cloudant();
const FITBIT_CLIENT_ID = process.env.FITBIT_CLIENT_ID;
const FITBIT_CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET;
const FITBIT_CLIENT_SECRET_64 = new Buffer(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString("base64");


/**
 * Represents a FitBit
 */
export default class FitBit {

    /**
     * Get user's steps for the day.
     * @param {string} user_id The fitbit user's id.
     * @param {string} access_token The fitbit user's access_token.
     * @param {string} day The day that you want data for
     * @returns {Object} The daily steps for the requested user.
     */
    async getSteps(user_id, access_token, day) {

        try {
            let results = await request({
                url: `https://api.fitbit.com/1/user/${user_id}/activities/steps/date/${day}/${day}.json`,
                headers: {
                    "Authorization": `Bearer  ${access_token}`
                },
            });

            if(results) {
                results = JSON.parse(results);
                return results["activities-steps"];
            }
        } catch(err) {
            logger.log("error",`Error occured getting steps from fitbit api: ${JSON.stringify(err,null,4)}`);
        }
    }

    /**
     * Get user's steps for the day.
     * @param {string} fitbit_id The fitbit user's id.
     * @param {string} access_token The fitbit user's access_token.
     * @param {string} day The day that you want data for
     * @returns {Object} The daily body_mass for the requested user.
     */
    async getMass(fitbit_id, access_token, day) {
        try {
            let results = await request({
                url: `https://api.fitbit.com/1/user/${fitbit_id}/body/log/weight/date/${day}/${day}.json`,
                headers: {
                    "Authorization": `Bearer  ${access_token}`
                },
            });
            if(results) {
                results = JSON.parse(results);
                results = (results["weight"].length > 0 ? results["weight"] : []);

                return results;
            }
        } catch(err) {
            logger.log("error",`Error occured getting mass from fitbit api: ${JSON.stringify(err,null,4)}`);
        }
    }


    /**
     * Get user's steps for the day.
     * @param {Object} user The user which needs to be revoked.
     * @returns {void}
     */
    async revokeAccess(user) {
        try {
            let results = await request({
                url: "https://api.fitbit.com/oauth2/revoke",
                headers: {
                    "Authorization": `Basic ${FITBIT_CLIENT_SECRET_64}`
                },
                qs: { "token": user.access_token }
            });
            logger.log("debug", `Revoking user's access response ==> ${ JSON.stringify(results,null,4) }`);
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
        let user_mass = await this.getMass(task.ownerId, user.access_token, task.date);
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
        return cb();
    }

    /**
     * Process steps for the day
     * @param {string} task A notification that a user's steps has changed.
     * @param {function} cb A callback for when the task is done
     * @returns {void}
     */
    async processSteps(task, cb) {
        let user = await db.getUser({ "selector" : { "fitbit_id": task.ownerId } });
        user = user.docs[0];
        let user_steps = await this.getSteps(task.ownerId, user.access_token, task.date);
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
        return cb();
    }
}
