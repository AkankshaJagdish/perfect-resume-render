import { CHECKOUT_SUCCESS_URL } from "../paths";
import { dodoClient } from "./client";

interface DodoCheckoutSessionParams {
  productId: string;
  userEmail: string;
  userId: string;
}

export async function createDodoCheckoutSession({
  productId,
  userEmail,
  userId,
}: DodoCheckoutSessionParams) {
  const session = await dodoClient.checkoutSessions.create({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: { email: userEmail },
    metadata: { userId },
    return_url: CHECKOUT_SUCCESS_URL,
  });

  if (!session.checkout_url) {
    throw new Error("Dodo checkout URL not found");
  }

  return {
    url: session.checkout_url,
    id: session.session_id,
  };
}
