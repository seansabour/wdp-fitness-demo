import Cloudant from "./cloudant.js";
import Fitbit from "./fitbit";
import { logger } from "./logger";
import Throttle from "promise-throttle";

const db = new Cloudant();
const fb = new Fitbit();

/**
 * Delete's all user's data that has registered after 08-10-2017.
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
