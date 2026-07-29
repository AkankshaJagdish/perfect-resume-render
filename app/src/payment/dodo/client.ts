import DodoPayments from "dodopayments";
import { env } from "wasp/server";

export const dodoClient = new DodoPayments({
  bearerToken: env.DODO_PAYMENTS_API_KEY,
  environment: env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode",
  webhookKey: env.DODO_PAYMENTS_WEBHOOK_KEY,
});
