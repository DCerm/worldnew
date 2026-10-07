import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { buildPublicUrl } from "@/lib/public-url";
import { getProductCheckoutRedirectUrl } from "@/lib/wordpress";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const user = await getCurrentUser();
  const { productId } = await params;
  const parsedProductId = Number(productId);
  const requestUrl = new URL(request.url);

  if (!user) {
    const returnTo = `${requestUrl.pathname}${requestUrl.search}`;
    return NextResponse.redirect(
      buildPublicUrl(request, `/login?returnTo=${encodeURIComponent(returnTo)}`)
    );
  }

  try {
    const { searchParams } = requestUrl;
    const returnTo = searchParams.get("returnTo");
    const checkoutAction = searchParams.get("action") === "cart" ? "cart" : "checkout";
    const redirectTo = await getProductCheckoutRedirectUrl(parsedProductId, user, {
      returnTo,
      useCommunityPrice: true,
      checkoutAction,
    });

    return NextResponse.redirect(redirectTo);
  } catch (error) {
    console.error("Product checkout redirect failed", error);

    return NextResponse.redirect(
      buildPublicUrl(request, "/media/audio?error=checkout-unavailable")
    );
  }
}
