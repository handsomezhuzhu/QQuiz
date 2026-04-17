import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  SESSION_COOKIE_NAME,
  buildBackendUrl
} from "@/lib/api/config";

type ServerApiOptions = RequestInit & {
  next?: { revalidate?: number };
};

export async function serverApi<T>(
  path: string,
  init: ServerApiOptions = {}
): Promise<T> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;

  const response = await fetch(buildBackendUrl(path), {
    ...init,
    cache: init.cache || "no-store",
    headers: {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (response.status === 401) {
    redirect("/login");
  }

  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      throw new Error(data?.detail || fallback);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(fallback);
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
