import * as z from "zod";

export const paymentPlansSchema = z.object({
  PAYMENTS_STARTER_SUBSCRIPTION_PLAN_ID: z.string({
    error: "PAYMENTS_STARTER_SUBSCRIPTION_PLAN_ID is required",
  }),
});
