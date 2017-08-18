import Cloudant from "./cloudant.js";
import Fitbit from "./fitbit";
import { logger } from "./logger";
import request from "request-promise";
import Throttle from "promise-throttle";

const db = new Cloudant();
const fb = new Fitbit();
const FITBIT_CLIENT_ID = process.env.FITBIT_CLIENT_ID;
const FITBIT_CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET;
const FITBIT_CLIENT_SECRET_64 = new Buffer(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString("base64");
/**
 * Process that kicks off updating the user's steps and weight for the day.
 * @returns {void}
 */
export function updateData() {
    logger.log("info","Pulling data to see if there are any changes since the last pull.");
    db.getAllUsers()
        .then((users) => {
            users.forEach((user) => {
                // Skip the design docs.
                if(user.doc["_id"].includes("_design")){
                    return;
                }

                fb.processData(user);
            });
        })
        .catch((err) => {
            logger.log("info",`There is an error pulling the users: ${ JSON.stringify(err,null,4) }`);
        });
}

/**
 * Process that refresh's user's access_token every 8 hours (https://dev.fitbit.com/docs/oauth2/#refreshing-tokens)
 * @returns {void}
 */
export async function refreshTokens(){
    let users = await db.getAllUsers();
    users.forEach(async (user) => {
        user = user.doc;

        // Skip the design docs.
        if(user["_id"].includes("_design")){
            return;
        }

        try {
            let refreshed_ua_token = await request({
                uri: "https://api.fitbit.com/oauth2/token",
                method: "POST",
                headers: {
                    "Authorization": `Basic ${FITBIT_CLIENT_SECRET_64}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                form: {"grant_type": "refresh_token", "refresh_token": user.refresh_token}
            });
            // Parse response and update user's doc
            refreshed_ua_token = JSON.parse(refreshed_ua_token);
            user.refresh_token = refreshed_ua_token.refresh_token;
            user.access_token = refreshed_ua_token.access_token;

            // Insert updated user doc into cloudant.
            let updated_user = await db.addUser(user);
            if(!updated_user.ok) {
                logger.error("There was an issue updating a user's doc in cloudant..");
            }

        } catch(err) {
            logger.log("error", `Error refreshing tokens for user ${JSON.stringify(err,null,4)}`);
        }
    });
}

/**
 * Process that refresh's user's access_token every 8 hours (https://dev.fitbit.com/docs/oauth2/#refreshing-tokens)
 * @returns {void}
 */
export async function deleteUsersData() {
    let users = await db.getAllUsers();
    const DELETE_DATE = new Date("2017-08-10T00:00:00Z").toISOString();
    logger.log("info",`Eliminating any data that is registered after ${DELETE_DATE}...`);

    try {

        // Cloudant lite has a 5 queries/sec limit
        const promiseThrottle = new Throttle({
            requestsPerSecond: 2,           // up to 1 request per second
            promiseImplementation: Promise  // the Promise library you are using
        });

        const deleteSteps = (doc) => {
            return new Promise((resolve) => {
                let steps = db.deleteSteps(doc);
                resolve(steps);
            });
        };

        const deleteMass = (doc) => {
            return new Promise((resolve) => {
                let weight = db.deleteMass(doc);
                resolve(weight);
            });
        };


        users.forEach(async (user) => {
            user = user.doc;

            // Skip the design docs.
            if(user["_id"].includes("_design")){
                return;
            }

            if(user.registered_on.split("T")[0] > DELETE_DATE){
                // Revoke access and delete all steps and weight for that particular user.
                let query = { "selector": { "fitbit_id": user.fitbit_id } };
                let steps = await db.getSteps(query);
                let weight = await db.getMass(query);

                // Throttle Deletes all step documents in throttle
                for(let doc of steps){
                    // Throttle requests
                    promiseThrottle.add(deleteSteps.bind(this, doc)).catch(e => e);
                }

                // Throttle Deletes all body_mass documents
                for(let doc of weight){
                    // Throttle requests
                    promiseThrottle.add(deleteMass.bind(this, doc)).catch(e => e);
                }

                // Delete user doc and revoke access from fitbit
                fb.revokeAccess(user);

                // Delete user from database.
                db.deleteUser(user);
            }
        });
    } catch(err) {
        logger.log("error",`There was an error: ${ JSON.stringify(err,null,4) }`);
    }
}
