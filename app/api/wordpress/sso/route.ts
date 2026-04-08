import { NextResponse } from "next/server";

import { finishWordPressLogin, verifySignedPayload } from "@/lib/wordpress";

function decodePayload(encodedPayload: string) {
  //const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
  //const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  //const raw = Buffer.from(padded, "base64").toString("utf8");
  const raw = Buffer.from(encodedPayload, 'base64url').toString('utf8');

  return {
    raw,
    payload: JSON.parse(raw) as {
      email?: string;
      wordpress_user_id?: number;
      wordpress_customer_id?: number | null;
      display_name?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      avatar_url?: string | null;
      cover_image_url?: string | null;
      bio?: string | null;
      roles?: string[];
      return_to?: string | null;
    },
  };
}

function payloadToUserInput(payload: {
  email?: string;
  wordpress_user_id?: number;
  wordpress_customer_id?: number | null;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  bio?: string | null;
  roles?: string[];
  return_to?: string | null;
}) {
  return {
    email: payload.email ?? "",
    wordpress_user_id: payload.wordpress_user_id ?? 0,
    wordpress_customer_id: payload.wordpress_customer_id ?? null,
    display_name: payload.display_name ?? null,
    first_name: payload.first_name ?? null,
    last_name: payload.last_name ?? null,
    avatar_url: payload.avatar_url ?? null,
    cover_image_url: payload.cover_image_url ?? null,
    bio: payload.bio ?? null,
    roles: payload.roles ?? ["member"],
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const encodedPayload = searchParams.get("payload");
    const signature = searchParams.get("signature");

    if (!encodedPayload || !signature) {
      return NextResponse.redirect(new URL("/login?error=missing-wordpress-payload", request.url));
    }

    const { raw, payload } = decodePayload(encodedPayload);

    if (!verifySignedPayload(raw, signature)) {
        console.error('Signature mismatch. Raw:', raw, 'Sig:', signature);
        return NextResponse.redirect(new URL("/login?error=invalid-wordpress-signature", request.url));
    }

    if (!payload.email || !payload.wordpress_user_id) {
      return NextResponse.redirect(new URL("/login?error=invalid-wordpress-user", request.url));
    }

    const { destination } = await finishWordPressLogin(payloadToUserInput(payload));
    const finalDestination = payload.return_to?.startsWith("/") ? payload.return_to : destination;

    return NextResponse.redirect(new URL(finalDestination, request.url));
  } catch (error) {
    console.error("WordPress GET SSO failed", error);
    // Optionally include error message in redirect (for debugging only)
    const message = encodeURIComponent(error instanceof Error ? error.message : 'unknown');
    return NextResponse.redirect(new URL(`/login?error=wordpress-sso-failed&details=${message}`, request.url));
    //return NextResponse.redirect(new URL("/login?error=wordpress-sso-failed", request.url));
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature =
      request.headers.get("x-worldnew-signature") ?? request.headers.get("x_wordnew_signature");

    if (!verifySignedPayload(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as Parameters<typeof payloadToUserInput>[0];

    if (!payload.email || !payload.wordpress_user_id) {
      return NextResponse.json({ error: "Missing email or wordpress_user_id." }, { status: 400 });
    }

    const { destination } = await finishWordPressLogin(payloadToUserInput(payload));

    const finalDestination = payload.return_to?.startsWith("/")
      ? payload.return_to
      : destination;

    return NextResponse.json({
      success: true,
      redirectTo: finalDestination,
    });
  } catch (error) {
    console.error("WordPress SSO failed", error);
    return NextResponse.json({ error: "SSO login failed." }, { status: 500 });
  }
}
