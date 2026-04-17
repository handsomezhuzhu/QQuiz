import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/api/config";

async function clearSession() {
  cookies().delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}

export async function POST() {
  return clearSession();
}

export async function GET() {
  return clearSession();
}
