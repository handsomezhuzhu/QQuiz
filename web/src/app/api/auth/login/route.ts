import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, buildBackendUrl } from "@/lib/api/config";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isSecureRequest =
    request.nextUrl.protocol === "https:" || forwardedProto === "https";

  const response = await fetch(buildBackendUrl("/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  const payload = await response.json();

  if (!response.ok) {
    return NextResponse.json(payload, { status: response.status });
  }

  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: payload.access_token,
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest,
    path: "/"
  });

  return NextResponse.json({ ok: true });
}
