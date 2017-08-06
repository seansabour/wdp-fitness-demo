import { Router } from "express";
import url from "url";
import request from "request-promise";
import cfenv from "cfenv";
import Cloudant from "../cloudant.js";
import { logger } from "../logger";

let app = new Router();
const db = new Cloudant();
const appEnv = cfenv.getAppEnv();
const FITBIT_CLIENT_ID = process.env.FITBIT_CLIENT_ID;
const FITBIT_CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET;
const FITBIT_CLIENT_SECRET_64 = new Buffer(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString("base64");
const FITBIT_CB_ENDPOINT = `${appEnv.url}/fitbit/callback`;

app.get("/callback", async (req,res) => {
    // Parse URL for authorization code.
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const authorize_code = url.parse(fullUrl, true, true).query.code;

    try {

        let user_authorization = await request({
            uri: "https://api.fitbit.com/oauth2/token",
            method: "POST",
            headers: {
                "Authorization": "Basic "+ FITBIT_CLIENT_SECRET_64,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            form: {"grant_type": "authorization_code", "client_id": FITBIT_CLIENT_ID, "redirect_uri": FITBIT_CB_ENDPOINT, "code": authorize_code}
        });

        user_authorization = JSON.parse(user_authorization);
        const access_token = user_authorization.access_token ;
        const expires_in_var = user_authorization.expires_in;
        const refresh_token = user_authorization.refresh_token;
        const scope_var = user_authorization.scope;
        const token_type_var = user_authorization.token_type;
        const fitbit_id = user_authorization.user_id;


        // Get users profile information: https://dev.fitbit.com/docs/user/
        let profile_request = await request({
            uri: `https://api.fitbit.com/1/user/${fitbit_id}/profile.json`,
            method: "GET",
            headers: {
                "Authorization": `Bearer ${access_token}`
            }
        });
        profile_request = JSON.parse(profile_request);

        // Check user to see if they exist, if so update info.
        let user_exist = await db.getUser({
            "selector": {
                name: profile_request.user.fullName,
                fitbit_id: fitbit_id
            }
        });
        let results;
        if(user_exist.docs.length > 0 ){
            // User exists already just update their access_token and refresh_token
            user_exist = user_exist.docs[0];
            user_exist.access_token = access_token;
            user_exist.refresh_token = refresh_token;
            results = await db.addUser(user_exist).catch(err => logger.log("error",`Error updating existing user: ${JSON.stringify(err,null,4)}`));
        } else {
            // No user exists, just register a new user.
            results = await db.addUser({
                name: profile_request.user.fullName || "UNKNOWN",
                age: profile_request.user.age || "UNKNOWN",
                gender: profile_request.user.gender || "UNKNOWN",
                fitbit_id,
                access_token,
                expires_in: expires_in_var,
                token_type:token_type_var,
                scope: scope_var,
                refresh_token: refresh_token,
            });
        }
        // Redirect to index page.
        if(!results.ok) {
            logger.log("error",`Error adding user to database: ${JSON.stringify(results,null,4)}`);
            res.redirect("/?error=Sorry, there seems to be an error. Please try again later.");
        } else {
            logger.log("info","Registered new user into database.");
            res.redirect("/?message=You are now registered into the challenge.");
        }

    } catch(err) {
        logger.log("error",`Error: ${JSON.stringify(err,null,4)}`);
    }
});

export default app;
