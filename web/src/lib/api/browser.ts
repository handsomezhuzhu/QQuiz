import { buildProxyUrl } from "@/lib/api/config";

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
  const response = await fetch(buildProxyUrl(path, buildSearchParams(query)), {
    ...init,
    headers: {
      ...(headers || {})
    },
    credentials: "same-origin",
    cache: "no-store"
  });

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
