import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, buildBackendUrl } from "@/lib/api/config";
import {
  getResponseErrorMessage,
  isRecord,
  readResponsePayload
} from "@/lib/api/response";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isSecureRequest =
    request.nextUrl.protocol === "https:" || forwardedProto === "https";

  let response: Response;
  try {
    response = await fetch(buildBackendUrl("/auth/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      cache: "no-store"
    });
  } catch {
    return NextResponse.json(
      { detail: "Backend API is unavailable." },
      { status: 502 }
    );
  }

  const payload = await readResponsePayload(response);

  if (!response.ok) {
    return NextResponse.json(
      { detail: getResponseErrorMessage(payload, "登录失败") },
      { status: response.status }
    );
  }

  if (!isRecord(payload) || typeof payload.access_token !== "string") {
    return NextResponse.json(
      { detail: "Backend returned an invalid login response." },
      { status: 502 }
    );
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
