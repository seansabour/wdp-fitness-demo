import winston from "winston";

export const logger = new (winston.Logger)({
    level: "verbose",
    transports: [
        new (winston.transports.Console)(),
    ]
});
