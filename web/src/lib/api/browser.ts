import { buildProxyUrl } from "@/lib/api/config";
import {
  getResponseErrorMessage,
  getUnexpectedJsonMessage,
  isRecord,
  readResponsePayload
} from "@/lib/api/response";

type BrowserApiOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | null;
  query?: Record<string, string | number | boolean | null | undefined>;
};

function buildSearchParams(
  query?: BrowserApiOptions["query"]
): URLSearchParams | undefined {
  if (!query) {
    return undefined;
  }

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  });

  return params;
}

export async function browserApi<T>(
  path: string,
  options: BrowserApiOptions = {}
): Promise<T> {
  const { query, headers, ...init } = options;
  const target = buildProxyUrl(path, buildSearchParams(query));
  const response = await fetch(target, {
    ...init,
    headers: {
      ...(headers || {})
    },
    credentials: "same-origin",
    cache: "no-store"
  });

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
