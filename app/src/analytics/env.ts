import * as z from "zod";

export const googleAnalyticsEnvSchema = z.object({
  GOOGLE_ANALYTICS_CLIENT_EMAIL: z.string().default(""),
  GOOGLE_ANALYTICS_PRIVATE_KEY: z.string().default(""),
  GOOGLE_ANALYTICS_PROPERTY_ID: z.string().default(""),
});
