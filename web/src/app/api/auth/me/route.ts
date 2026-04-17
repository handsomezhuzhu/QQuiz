import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  buildBackendUrl
} from "@/lib/api/config";

export async function GET() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const response = await fetch(buildBackendUrl("/auth/me"), {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  const payload = await response.json();

  if (response.status === 401) {
    cookies().delete(SESSION_COOKIE_NAME);
  }

  return NextResponse.json(payload, { status: response.status });
}
