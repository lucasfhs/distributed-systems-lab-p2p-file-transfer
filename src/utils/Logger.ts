// logger.ts
import winston from "winston";
import fs from "fs";
import path from "path";

export class Logger {
  private logger: winston.Logger;

  constructor(context?: string) {
    const logDir = path.join(process.cwd(), "logs");

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }

    const { combine, timestamp, printf, colorize, errors } = winston.format;

    const logFormat = printf(({ level, message, timestamp, stack }) => {
      return `[${timestamp}] ${context ? `[${context}] ` : ""}${level}: ${stack || message}`;
    });

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || "debug",
      format: combine(
        errors({ stack: true }),
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        logFormat
      ),
      transports: [
        new winston.transports.Console({
          format: combine(colorize(), logFormat),
        }),
        new winston.transports.File({
          filename: path.join(logDir, "app.log"),
          level: "info",
        }),
        new winston.transports.File({
          filename: path.join(logDir, "error.log"),
          level: "error",
        }),
      ],
    });
  }

  info(message: string) {
    this.logger.info(message);
  }

  warn(message: string) {
    this.logger.warn(message);
  }

  error(message: string | Error) {
    this.logger.error(message);
  }

  debug(message: string) {
    this.logger.debug(message);
  }
}