import { redirect } from "next/navigation";

import { readSessionToken } from "@/lib/auth/session";

export default function IndexPage() {
  redirect(readSessionToken() ? "/dashboard" : "/login");
}
