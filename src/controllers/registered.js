import { Router } from "express";

let app = new Router();

app.get("/", (req,res) => {
    res.render("registered");
});

export default app;
