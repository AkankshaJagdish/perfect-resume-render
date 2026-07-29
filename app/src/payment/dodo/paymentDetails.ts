import { PrismaClient } from "@prisma/client";
import type { SubscriptionStatus } from "../plans";
import { PaymentPlanId, STARTER_MONTHLY_CREDITS } from "../plans";

export const updateUserDodoPaymentDetails = async (
  {
    dodoCustomerId,
    userId,
    subscriptionPlan,
    subscriptionStatus,
    datePaid,
    resetCredits,
  }: {
    dodoCustomerId: string;
    userId: string;
    subscriptionPlan?: PaymentPlanId;
    subscriptionStatus?: SubscriptionStatus;
    resetCredits?: boolean;
    datePaid?: Date;
  },
  prismaUserDelegate: PrismaClient["user"],
) => {
  return prismaUserDelegate.update({
    where: {
      id: userId,
    },
    data: {
      paymentProcessorUserId: dodoCustomerId,
      subscriptionPlan,
      subscriptionStatus,
      datePaid,
      credits: resetCredits ? STARTER_MONTHLY_CREDITS : undefined,
    },
  });
};
