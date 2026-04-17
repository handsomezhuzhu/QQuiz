import { redirect } from "next/navigation";

import { serverApi } from "@/lib/api/server";
import { AuthUser } from "@/lib/types";

export async function requireCurrentUser() {
  try {
    return await serverApi<AuthUser>("/auth/me");
  } catch (_error) {
    redirect("/login");
  }
}

export async function requireAdminUser() {
  const user = await requireCurrentUser();
  if (!user.is_admin) {
    redirect("/dashboard");
  }

  return user;
}
