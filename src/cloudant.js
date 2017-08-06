import cloudant from "cloudant";
import Promise from "bluebird";

/**
 * Represents a Cloudant DB
 */
export default class Cloudant {
    /**
     * Creates a cloudant db connection.
     * @constructor
    */
    constructor() {
        this.cloudant = new cloudant({ account: process.env.CLOUDANT_ACCOUNT, key: process.env.CLOUDANT_API_KEY, password: process.env.CLOUDANT_PASSWORD });
        this.mass_db = this.cloudant.db.use("weight");
        this.user_db = this.cloudant.db.use("users");
        this.steps_db = this.cloudant.db.use("steps");
    }

    /**
     * Returns all users registered.
     * @returns {Array} All users registered in the db.
     */
    getAllUsers() {
        return new Promise((resolve,reject) => {
            this.user_db.list({ include_docs:true }, (err, data) => {
                if(err) reject(err);

                resolve(data.rows);
            });
        });
    }

    /**
     * Register user into database.
     * @param {Object} doc A formatted doc for cloudant to insert a user
     * @returns {Object} Response from cloudant.
     */
    addUser(doc) {
        //TODO: Add check to see if user, already exists.
        return new Promise((resolve,reject) => {
            this.user_db.insert(doc, (err, data) => {
                if(err) reject(err);

                resolve(data);
            });
        });
    }

    /**
     * Retrieves a user from the database.
     * @param {Object} query A formatted query for cloudant to retrieve a user.
     * @returns {Object} Response from cloudant.
     */
    getUser(query) {
        return new Promise((resolve,reject) => {
            this.user_db.find(query, (err, data) => {
                if(err) reject(err);

                resolve(data);
            });
        });
    }

    /**
     * Insert steps into db.
     * @param {Object} doc A formatted doc for cloudant to insert steps for a given user
     * @returns {Object} Response from cloudant.
     */
    insertSteps(doc) {
        return new Promise((resolve,reject) => {
            this.steps_db.insert(doc, (err, data) => {
                if(err) reject(err);

                resolve(data);
            });
        });
    }
    /**
     * Insert steps in bulk into db.
     * @param {Array} docs An array of formatted doc for cloudant to insert steps for a given user
     * @returns {Object} Response from cloudant.
     */
    insertBulkSteps(docs) {
        return new Promise((resolve,reject) => {
            this.steps_db.bulk({ docs }, (err, data) => {
                if(err) reject(err);

                resolve(data);
            });
        });
    }
    /**
     * Insert weight in bulk into db.
     * @param {Array} docs An array of formatted doc for cloudant to insert weight for a given user
     * @returns {Object} Response from cloudant.
     */
    insertBulkWeight(docs) {
        return new Promise((resolve,reject) => {
            this.mass_db.bulk({ docs }, (err, data) => {
                if(err) reject(err);

                resolve(data);
            });
        });
    }


    /**
     * Returns steps for a given user.
     * @param {Object} query A formatted query for cloudant to get steps for a given user
     * @returns {Array} Returns all steps for a given user.
     */
    getSteps(query) {
        return new Promise((resolve,reject) => {
            this.steps_db.find(query, (err, data) => {
                if(err) reject(err);
                data = (data ? data.docs : []);
                resolve(data);
            });
        });
    }

    /**
     * Insert weight into db.
     * @param {Object} doc A formatted doc for cloudant to insert weight for a given user
     * @returns {Object} Response from cloudant.
     */
    insertMass(doc) {
        return new Promise((resolve,reject) => {
            this.mass_db.insert(doc, (err, data) => {
                if(err) reject(err);

                resolve(data);
            });
        });
    }

    /**
     * Returns weight for a given user.
     * @param {Object} query A formatted query for cloudant to get weight for a given user
     * @returns {Array} Returns all weight for a given user.
     */
    getMass(query) {
        return new Promise((resolve,reject) => {
            this.mass_db.find(query, (err, data) => {
                if(err) reject(err);

                data = (data ? data.docs : []);
                resolve(data);
            });
        });
    }
}
