import pino from "pino";

export const serverLogger = pino({
  name: "fmweb-connector",
  level: process.env.LOG_LEVEL ?? "info",
  base: undefined
});
