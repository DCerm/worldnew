import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { buildPublicUrl } from "@/lib/public-url";
import { getCheckoutRedirectUrl } from "@/lib/wordpress";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ planCode: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(
      buildPublicUrl(request, "/login?error=Please sign in before checkout.")
    );
  }

  try {
    const { planCode } = await params;
    const { searchParams } = new URL(request.url);
    const returnTo = searchParams.get("returnTo");
    const redirectTo = await getCheckoutRedirectUrl(planCode, user, { returnTo });

    return NextResponse.redirect(redirectTo);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown checkout redirect error";

    if (message.includes("No WooCommerce product mapping found for plan")) {
      console.warn("Checkout redirect unavailable:", message);
    } else {
      console.error("Checkout redirect failed", error);
    }

    return NextResponse.redirect(
      buildPublicUrl(request, "/dashboard?error=checkout-unavailable")
    );
  }
}
