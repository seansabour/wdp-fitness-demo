import { deleteUsersData } from "./jobs.js";
import { CronJob } from "cron";
import { logger } from "./logger";

/**
 * Represents a Cron scheduler
 */
export default class Cron {
    /**
     * Starts the provided cronjobs.
     * @returns {void}
     */
    start(){
        // Deletes all newly registered users data at midnight every night.
        new CronJob("0 0 12 * * *", function() {
            logger.info("Deleting user's data that is past deployment date..")
            deleteUsersData();
        }, null, true, "America/Los_Angeles");
    }
}
