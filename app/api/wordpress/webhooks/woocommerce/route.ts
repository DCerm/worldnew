import { NextResponse } from "next/server";

import { applyWooCommerceWebhook, verifySignedPayload } from "@/lib/wordpress";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature =
      request.headers.get("x-worldnew-signature") ??
      request.headers.get("x_wordnew_signature") ??
      request.headers.get("x-wc-webhook-signature");

    if (!verifySignedPayload(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as {
      event?: string;
      order_id?: string | number | null;
      subscription_id?: string | number | null;
      user?: {
        email?: string | null;
        wordpress_user_id?: number | null;
        wordpress_customer_id?: number | null;
        display_name?: string | null;
        first_name?: string | null;
        last_name?: string | null;
      };
      membership?: {
        plan_code?: string | null;
        status?: string | null;
        starts_at?: string | null;
        ends_at?: string | null;
        auto_renews?: boolean | null;
        amount?: number | null;
        currency?: string | null;
      };
    };

    const result = await applyWooCommerceWebhook(payload);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("WooCommerce webhook failed", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
