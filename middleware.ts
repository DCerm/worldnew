import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

  if (!canonical) {
    return NextResponse.next();
  }

  const incomingHost = request.headers.get("host") ?? "";
  const incomingHostname = incomingHost.split(":")[0];

  // In local Docker we sometimes browse via 0.0.0.0 while links/cookies
  // resolve to localhost. Force a single host to keep session cookies stable.
  if (incomingHostname === "0.0.0.0") {
    const target = request.nextUrl.clone();
    target.protocol = canonical.protocol;
    target.host = canonical.host;
    return NextResponse.redirect(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
