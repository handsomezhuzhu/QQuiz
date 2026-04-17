import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  SESSION_COOKIE_NAME,
  buildBackendUrl
} from "@/lib/api/config";
import {
  getResponseErrorMessage,
  getUnexpectedJsonMessage,
  isRecord,
  readResponsePayload
} from "@/lib/api/response";

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
    const payload = await readResponsePayload(response);
    throw new Error(getResponseErrorMessage(payload, fallback));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await readResponsePayload(response);
  if (!isRecord(payload) && !Array.isArray(payload)) {
    throw new Error(getUnexpectedJsonMessage(response));
  }

  return payload as T;
}
