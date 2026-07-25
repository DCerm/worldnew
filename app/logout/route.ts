import { NextResponse } from "next/server";

import { clearSession } from "@/lib/auth";
import { getPublicBaseUrlFromRequest } from "@/lib/public-url";

export async function GET(request: Request) {
  return NextResponse.redirect(getPublicBaseUrlFromRequest(request), { status: 302 });
}

export async function POST(request: Request) {
  await clearSession();
  return NextResponse.redirect(getPublicBaseUrlFromRequest(request), { status: 303 });
}
