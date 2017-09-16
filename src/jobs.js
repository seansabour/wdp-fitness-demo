import Cloudant from "./cloudant.js";
import { logger } from "./logger";
import request from "request-promise";

const db = new Cloudant();
const FITBIT_CLIENT_ID = process.env.FITBIT_CLIENT_ID;
const FITBIT_CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET;
const FITBIT_CLIENT_SECRET_64 = new Buffer(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString("base64");

/**
 * Process that refresh's user's access_token every X hours (https://dev.fitbit.com/docs/oauth2/#refreshing-tokens)
 * For the scope of this blog, we will refresh every 8 hours, a better approach for scale would be to refresh only
 * when the token is expired.
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
