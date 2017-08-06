import { updateData, refreshTokens } from "./jobs.js";
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
        // Refresh tokens on start, in-case app hasn't been stopped for more then 8 hours.
        logger.log("info","Refreshing tokens from fitbit...");
        refreshTokens();

        // Update all user's steps and weight every 30 minutes.
        new CronJob("0 */30 * * * *", function() {
            logger.log("info","Pulling data from fitbit...");
            updateData();
        }, null, true, "America/Los_Angeles");

        // Refresh fitbit access_token/refresh_token for all users every 5 hours.
        new CronJob("0 0 */5 * * *", function() {
            logger.log("info","Refreshing tokens from fitbit...");
            refreshTokens();
        }, null, true, "America/Los_Angeles");
    }
}
