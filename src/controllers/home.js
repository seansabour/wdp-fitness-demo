import { Router } from "express";
import url from "url";

let app = new Router();

app.get("/", (req,res) => {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const message = url.parse(fullUrl, true, true).query.message || "";
    const error = url.parse(fullUrl, true, true).query.error || "";

    res.render("index", {
        message : message,
        error: error,
        info: (message || error ? "" : "You must have a fitbit account before trying to register (https://www.fitbit.com/signup).")
    });
});

export default app;
