import type {
  CreateCheckoutSessionArgs,
  FetchCustomerPortalUrlArgs,
  PaymentProcessor,
} from "../paymentProcessor";
import { getPaymentProcessorPlanId } from "../paymentProcessorPlans";
import { createDodoCheckoutSession } from "./checkoutUtils";
import { dodoClient } from "./client";
import { dodoMiddlewareConfigFn, dodoWebhook } from "./webhook";

export const dodoPaymentProcessor: PaymentProcessor = {
  id: "dodo",
  createCheckoutSession: async ({
    userId,
    userEmail,
    paymentPlan,
  }: CreateCheckoutSessionArgs) => {
    if (!userId)
      throw new Error("User ID needed to create Dodo Checkout Session");
    const session = await createDodoCheckoutSession({
      productId: getPaymentProcessorPlanId(paymentPlan),
      userEmail,
      userId,
    });
    return { session };
  },
  fetchCustomerPortalUrl: async (args: FetchCustomerPortalUrlArgs) => {
    const user = await args.prismaUserDelegate.findUniqueOrThrow({
      where: { id: args.userId },
      select: { paymentProcessorUserId: true },
    });

    if (!user.paymentProcessorUserId) return null;

    const portalSession = await dodoClient.customers.customerPortal.create(
      user.paymentProcessorUserId,
    );
    return portalSession.link;
  },
  webhook: dodoWebhook,
  webhookMiddlewareConfigFn: dodoMiddlewareConfigFn,
  fetchTotalRevenue: async () => {
    let totalRevenue = 0;

    for await (const payment of dodoClient.payments.list()) {
      totalRevenue += payment.total_amount;
    }

    return totalRevenue / 100;
  },
};
