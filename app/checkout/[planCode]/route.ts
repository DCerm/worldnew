import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getCheckoutRedirectUrl } from "@/lib/wordpress";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ planCode: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=Please sign in before checkout.", request.url));
  }

  try {
    const { planCode } = await params;
    const { searchParams } = new URL(request.url);
    const returnTo = searchParams.get("returnTo");
    const redirectTo = await getCheckoutRedirectUrl(planCode, user, returnTo);

    return NextResponse.redirect(redirectTo);
  } catch (error) {
    console.error("Checkout redirect failed", error);
    return NextResponse.redirect(new URL("/dashboard?error=checkout-unavailable", request.url));
  }
}
