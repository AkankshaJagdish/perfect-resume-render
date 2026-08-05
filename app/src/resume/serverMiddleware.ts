import cors from "cors";
import { config, type MiddlewareConfigFn } from "wasp/server";

const additionalResumeApiOrigins = [
  "https://perfectresume-client.onrender.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

export const resumeApiMiddlewareConfigFn: MiddlewareConfigFn = (
  middlewareConfig,
) => {
  // Safely ensure allowedCORSOrigins is handled as an array
  const baseOrigins = Array.isArray(config.allowedCORSOrigins)
    ? config.allowedCORSOrigins
    : typeof config.allowedCORSOrigins === 'string'
    ? [config.allowedCORSOrigins]
    : [];

  const uniqueOrigins = Array.from(
    new Set([...baseOrigins, ...additionalResumeApiOrigins])
  );

  middlewareConfig.set(
    "cors",
    cors({
      origin: uniqueOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  return middlewareConfig;
};
