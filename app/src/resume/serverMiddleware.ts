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
  middlewareConfig.set(
    "cors",
    cors({
      origin: Array.from(
        new Set([...config.allowedCORSOrigins, ...additionalResumeApiOrigins]),
      ),
      credentials: true,
    }),
  );

  return middlewareConfig;
};
