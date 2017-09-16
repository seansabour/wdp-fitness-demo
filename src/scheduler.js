import { refreshTokens, deleteUsersData } from "./jobs.js";
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

        // For the scope of this blog, we will refresh every 8 hours, a better approach for scale would be to refresh only
        // when the token is expired.
        // Refresh fitbit access_token/refresh_token for all users every 5 hours.
        new CronJob("0 0 */5 * * *", function() {
            logger.log("info","Refreshing tokens from fitbit...");
            refreshTokens();
        }, null, true, "America/Los_Angeles");

        // Deletes all newly registered users data at midnight every night.
        new CronJob("0 0 12 * * *", function() {
            deleteUsersData();
        }, null, true, "America/Los_Angeles");
    }
}
