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

  if (!user) {
    return NextResponse.redirect(
      buildPublicUrl(request, `/login?returnTo=/checkout/product/${encodeURIComponent(productId)}`)
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const returnTo = searchParams.get("returnTo");
    const redirectTo = await getProductCheckoutRedirectUrl(parsedProductId, user, {
      returnTo,
      useCommunityPrice: true,
    });

    return NextResponse.redirect(redirectTo);
  } catch (error) {
    console.error("Product checkout redirect failed", error);

    return NextResponse.redirect(
      buildPublicUrl(request, "/media/audio?error=checkout-unavailable")
    );
  }
}
