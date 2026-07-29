import { type PrismaClient } from "@prisma/client";
import type { Payment, Subscription } from "dodopayments/resources";
import express from "express";
import { HttpError, type MiddlewareConfigFn } from "wasp/server";
import { type PaymentsWebhook } from "wasp/server/api";
import { getPaymentPlanIdByPaymentProcessorPlanId } from "../paymentProcessorPlans";
import { SubscriptionStatus } from "../plans";
import { dodoClient } from "./client";
import { updateUserDodoPaymentDetails } from "./paymentDetails";

export const dodoWebhook: PaymentsWebhook = async (
  request,
  response,
  context,
) => {
  try {
    const rawRequestBody = request.body.toString("utf8");
    const event = dodoClient.webhooks.unwrap(rawRequestBody, {
      headers: getRequestHeaders(request),
    });

    const prismaUserDelegate = context.entities.User;

    switch (event.type) {
      case "payment.succeeded":
        await handlePaymentSucceeded(event.data, prismaUserDelegate);
        break;
      case "subscription.active":
        await handleSubscriptionActive(event.data, prismaUserDelegate);
        break;
      case "subscription.renewed":
        await handleSubscriptionRenewed(event.data, prismaUserDelegate);
        break;
      case "subscription.cancelled":
        await handleSubscriptionCancelled(event.data, prismaUserDelegate);
        break;
      case "subscription.expired":
        await handleSubscriptionExpired(event.data, prismaUserDelegate);
        break;
      default:
        console.log(`Ignoring unsupported Dodo webhook event: ${event.type}`);
    }

    return response.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    if (err instanceof HttpError) {
      return response.status(err.statusCode).json({ error: err.message });
    } else {
      return response
        .status(400)
        .json({ error: "Error Processing Dodo Webhook Event" });
    }
  }
};

export const dodoMiddlewareConfigFn: MiddlewareConfigFn = (
  middlewareConfig,
) => {
  middlewareConfig.delete("express.json");
  middlewareConfig.set(
    "express.raw",
    express.raw({ type: "application/json" }),
  );
  return middlewareConfig;
};

function getRequestHeaders(request: express.Request): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === "string") {
      headers[key] = value;
    } else if (Array.isArray(value)) {
      headers[key] = value.join(",");
    }
  }
  return headers;
}

async function handlePaymentSucceeded(
  payment: Payment,
  prismaUserDelegate: PrismaClient["user"],
) {
  const userId = getUserIdFromMetadata(payment.metadata);
  await updateUserDodoPaymentDetails(
    {
      dodoCustomerId: payment.customer.customer_id,
      userId,
      datePaid: new Date(payment.created_at),
    },
    prismaUserDelegate,
  );

  console.log(`Payment ${payment.payment_id} succeeded for user ${userId}`);
}

async function handleSubscriptionActive(
  subscription: Subscription,
  prismaUserDelegate: PrismaClient["user"],
) {
  await updateUserForSubscription(
    subscription,
    SubscriptionStatus.Active,
    true,
    prismaUserDelegate,
  );
  console.log(`Subscription ${subscription.subscription_id} active`);
}

async function handleSubscriptionRenewed(
  subscription: Subscription,
  prismaUserDelegate: PrismaClient["user"],
) {
  await updateUserForSubscription(
    subscription,
    SubscriptionStatus.Active,
    true,
    prismaUserDelegate,
  );
  console.log(`Subscription ${subscription.subscription_id} renewed`);
}

async function handleSubscriptionCancelled(
  subscription: Subscription,
  prismaUserDelegate: PrismaClient["user"],
) {
  await updateUserForSubscription(
    subscription,
    SubscriptionStatus.CancelAtPeriodEnd,
    false,
    prismaUserDelegate,
  );
  console.log(`Subscription ${subscription.subscription_id} cancelled`);
}

async function handleSubscriptionExpired(
  subscription: Subscription,
  prismaUserDelegate: PrismaClient["user"],
) {
  await updateUserForSubscription(
    subscription,
    SubscriptionStatus.Deleted,
    false,
    prismaUserDelegate,
  );
  console.log(`Subscription ${subscription.subscription_id} expired`);
}

async function updateUserForSubscription(
  subscription: Subscription,
  subscriptionStatus: SubscriptionStatus,
  resetCredits: boolean,
  prismaUserDelegate: PrismaClient["user"],
) {
  const userId = getUserIdFromMetadata(subscription.metadata);
  const paymentPlanId = getPaymentPlanIdByPaymentProcessorPlanId(
    subscription.product_id,
  );

  await updateUserDodoPaymentDetails(
    {
      dodoCustomerId: subscription.customer.customer_id,
      userId,
      subscriptionPlan: paymentPlanId,
      subscriptionStatus,
      datePaid: new Date(subscription.previous_billing_date),
      resetCredits,
    },
    prismaUserDelegate,
  );
}

function getUserIdFromMetadata(
  metadata: Record<string, string | number | boolean>,
) {
  const userId = metadata.userId ?? metadata.user_id;
  if (typeof userId !== "string") {
    throw new HttpError(400, "Dodo webhook metadata userId not provided");
  }
  return userId;
}
