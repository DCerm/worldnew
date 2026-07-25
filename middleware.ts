import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DEVICE_COOKIE = "worldnew_device_id";

function getCanonicalUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;

  if (!fromEnv) {
    return null;
  }

  try {
    return new URL(fromEnv);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const canonical = getCanonicalUrl();
  const deviceId = request.cookies.get(DEVICE_COOKIE)?.value;
  const secureCookie = (canonical?.protocol ?? request.nextUrl.protocol) === "https:";

  if (!canonical) {
    const response = NextResponse.next();

    if (!deviceId) {
      response.cookies.set(DEVICE_COOKIE, globalThis.crypto.randomUUID(), {
        httpOnly: true,
        sameSite: "lax",
        secure: secureCookie,
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return response;
  }

  const incomingHost = request.headers.get("host") ?? "";
  const incomingHostname = incomingHost.split(":")[0];

  // In local Docker we sometimes browse via 0.0.0.0 while links/cookies
  // resolve to localhost. Force a single host to keep session cookies stable.
  if (incomingHostname === "0.0.0.0") {
    const target = request.nextUrl.clone();
    target.protocol = canonical.protocol;
    target.host = canonical.host;
    const response = NextResponse.redirect(target);

    if (!deviceId) {
      response.cookies.set(DEVICE_COOKIE, globalThis.crypto.randomUUID(), {
        httpOnly: true,
        sameSite: "lax",
        secure: canonical.protocol === "https:",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return response;
  }

  const response = NextResponse.next();

  if (!deviceId) {
    response.cookies.set(DEVICE_COOKIE, globalThis.crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
