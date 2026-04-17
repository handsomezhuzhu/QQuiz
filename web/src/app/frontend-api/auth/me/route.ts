import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  buildBackendUrl
} from "@/lib/api/config";
import {
  getResponseErrorMessage,
  isRecord,
  readResponsePayload
} from "@/lib/api/response";

export async function GET() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  let response: Response;
  try {
    response = await fetch(buildBackendUrl("/auth/me"), {
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: "no-store"
    });
  } catch {
    return NextResponse.json(
      { detail: "Backend API is unavailable." },
      { status: 502 }
    );
  }

  const payload = await readResponsePayload(response);

  if (response.status === 401) {
    cookies().delete(SESSION_COOKIE_NAME);
  }

  if (!response.ok) {
    return NextResponse.json(
      { detail: getResponseErrorMessage(payload, "获取当前用户失败") },
      { status: response.status }
    );
  }

  if (!isRecord(payload)) {
    return NextResponse.json(
      { detail: "Backend returned an invalid auth response." },
      { status: 502 }
    );
  }

  return NextResponse.json(payload, { status: response.status });
}
