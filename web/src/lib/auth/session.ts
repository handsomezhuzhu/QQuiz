import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME } from "@/lib/api/config";

export function readSessionToken() {
  return cookies().get(SESSION_COOKIE_NAME)?.value || null;
}

export function requireSessionToken() {
  const token = readSessionToken();
  if (!token) {
    redirect("/login");
  }

  return token;
}
