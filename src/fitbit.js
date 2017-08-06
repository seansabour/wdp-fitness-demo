import Cloudant from "./cloudant.js";
import request from "request-promise";
import { logger } from "./logger";
import pThrottle from "p-throttle";

const db = new Cloudant();
/**
 * Represents a FitBit
 */
export default class FitBit {

    /**
     * Get user's steps for the day.
     * @param {string} user_id The fitbit user's id.
     * @param {string} access_token The fitbit user's access_token.
     * @returns {Object} The daily steps for the requested user.
     */
    async getSteps(user_id, access_token) {
        let now = new Date();
        let date = `${ now.getFullYear() }-${ ("0" + (now.getMonth()+1) ).slice(-2) }-${ ("0" + now.getDate()).slice(-2) }`;

        try {
            let results = await request({
                // TODO: Subtract 31 days from today's date and replace 2017-07-15, FitBit has a 31 day limit.
                url: `https://api.fitbit.com/1/user/${user_id}/activities/steps/date/2017-07-15/${date}.json`,
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
     * @returns {Object} The daily body_mass for the requested user.
     */
    async getMass(fitbit_id, access_token) {
        let now = new Date();
        let date = `${ now.getFullYear() }-${ ("0" + (now.getMonth()+1) ).slice(-2) }-${ ("0" + now.getDate()).slice(-2) }`;

        try {
            let results = await request({
                // TODO: Subtract 31 days from today's date and replace 2017-07-15, FitBit has a 31 day limit.
                url: `https://api.fitbit.com/1/user/${fitbit_id}/body/log/weight/date/2017-07-15/${date}.json`,
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
     * Process steps for the day
     * @param {string} name The fitbit user's id.
     * @param {string} fitbit_id The fitbit user's id.
     * @param {Array} periods The fitbit user's daily steps since begining of the pull.
     * @returns {void}
     */
    async processSteps(name, fitbit_id, periods) {
        try {
            // Cloudant lite has a low queries/sec limit, so we must limit the queries to cloudant to 1 per 2 second.
            const throttled = pThrottle(day => {
                let query = { "selector": { "date": day.dateTime, "name": name}};
                let docs = db.getSteps(query);
                return Promise.resolve(docs);
            }, 1, 2000);

            for(let day of periods){
                // Throttle requests
                throttled(day).then(docs => {
                    if(docs.length > 0) {
                        let doc = docs[0];
                        // Dates are the same, check to see if the user has taken more steps then previously recorded.
                        if(doc.steps < day.value) {
                            //Update the doc here..
                            doc.steps = parseInt(day.value);
                            db.insertSteps(doc);
                        }
                    } else {
                        // Steps for the day are not in database, insert new record.
                        db.insertSteps({
                            steps: parseInt(day.value),
                            name,
                            fitbit_id,
                            date: day.dateTime
                        });
                    }
                });
            }
        } catch(err) {
            logger.log("error",`Error occured: ${JSON.stringify(err,null,4)}`);
        }
    }

    /**
     * Process weight for the day
     * @param {string} name The fitbit user's id.
     * @param {string} fitbit_id The fitbit user's id.
     * @param {Array} periods The fitbit user's daily weight since begining of the pull.
     * @returns {void}
     */
    async processMass(name, fitbit_id, periods) {
        try {
            // Cloudant lite has a low queries/sec limit, so we must limit the queries to cloudant to 1 per 2 second.
            const throttled = pThrottle(day => {

                let query = { "selector": { "date": day.date, "name": name}};
                let docs = db.getMass(query);
                return Promise.resolve(docs);
            }, 1, 2000);

            for(let day of periods){
                // Throttle requests
                throttled(day).then(docs => {
                    if(docs.length > 0) {
                        let doc = docs[0];
                        // Dates are the same, check to see if the user has taken more steps then previously recorded.
                        if(doc.body_mass !== day.weight) {
                            //Update the doc here..
                            doc.body_mass = day.weight;
                            db.insertMass(doc);
                        }
                    } else {
                        // Steps for the day are not in database, insert new record.
                        db.insertMass({
                            body_mass: day.weight,
                            name,
                            fitbit_id,
                            date: day.date
                        });
                    }
                });
            }
        } catch(err) {
            logger.log("error",`Error occured: ${JSON.stringify(err,null,4)}`);
        }
    }

    /**
     * Process data for a given user
     * @param {Object} user The fitbit user's cloudant doc
     * @returns {void}
     */
    async processData(user) {
        let name = user.doc.name;
        let fitbit_id = user.doc.fitbit_id;
        let access_token = user.doc.access_token;
        // console.log(`getting steps... name: ${name} - fit id ${fitbit_id} -- access_token ${access_token}`);
        try {
            let steps_periods = await this.getSteps(fitbit_id, access_token);

            logger.log("info","Processing steps to see if any updates need to happen..");
            await this.processSteps(name, fitbit_id, steps_periods);

            let weight_periods = await this.getMass(fitbit_id, access_token);
            logger.log("info","Processing body mass to see if any updates need to happen");
            await this.processMass(name, fitbit_id, weight_periods);

        } catch(err) {
            logger.log("error",`Error happened with processing data: ${JSON.stringify(err,null,4)}`);
        }
    }
}
