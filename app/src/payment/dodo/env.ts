import * as z from "zod";
import { paymentPlansSchema } from "../env";

export const dodoEnvSchema = paymentPlansSchema.extend({
  DODO_PAYMENTS_API_KEY: z.string({
    error: "DODO_PAYMENTS_API_KEY is required",
  }),
  DODO_PAYMENTS_WEBHOOK_KEY: z.string({
    error: "DODO_PAYMENTS_WEBHOOK_KEY is required",
  }),
  DODO_PAYMENTS_ENVIRONMENT: z
    .enum(["test_mode", "live_mode"])
    .default("test_mode"),
});
