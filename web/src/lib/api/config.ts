export const SESSION_COOKIE_NAME = "access_token";

export function getApiBaseUrl() {
  return process.env.API_BASE_URL || "http://localhost:8000";
}

export function buildBackendUrl(path: string) {
  const trimmedBase = getApiBaseUrl().replace(/\/$/, "");
  const normalizedPath = path.startsWith("/api/")
    ? path
    : `/api/${path.replace(/^\//, "")}`;

  return `${trimmedBase}${normalizedPath}`;
}

export function buildProxyUrl(path: string, search?: URLSearchParams) {
  const normalizedPath = path.replace(/^\/+/, "");
  const query = search?.toString();

  return query
    ? `/api/proxy/${normalizedPath}?${query}`
    : `/api/proxy/${normalizedPath}`;
}
