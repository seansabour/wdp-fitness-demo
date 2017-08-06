import express from "express";
import bodyParser from "body-parser";
import Scheduler from "./scheduler";
import path from "path";
import cfenv from "cfenv";
import { logger } from "./logger";

import home from "./controllers/home";
import fitbit from "./controllers/fitbit";

const schedule = new Scheduler();
let app = new express();

// Middleware to handle application/json and applicat/x-www-form-urlencoded
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set("views", path.join(__dirname, "public"));

app.set("view engine","ejs");

app.use(express.static(__dirname + "/public"));
// Middleware routes
app.use("/", home);
app.use("/fitbit", fitbit);

const appEnv = cfenv.getAppEnv();
const PORT = appEnv.port || 3000;

// Start scheduler that handles jobs.
schedule.start();

// start server on the specified port and binding host
app.listen(PORT, "0.0.0.0", function() {
    logger.log("info","server starting on " + appEnv.url);
});
