function isJsonContentType(contentType: string | null) {
  return Boolean(contentType && (contentType.includes("application/json") || contentType.includes("+json")));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function readResponsePayload(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  const raw = await response.text();
  if (!raw) {
    return null;
  }

  if (!isJsonContentType(response.headers.get("content-type"))) {
    return raw;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

export function getResponseErrorMessage(payload: unknown, fallback: string) {
  if (isRecord(payload)) {
    const detail = payload.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }

    const message = payload.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    const trimmed = payload.trim();
    if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
      return `${fallback} 接口返回了 HTML 而不是 JSON，请检查前端代理和后端服务。`;
    }
    return trimmed;
  }

  return fallback;
}

export function getUnexpectedJsonMessage(response: Response) {
  const contentType = response.headers.get("content-type") || "unknown content type";
  if (contentType.includes("text/html")) {
    return "接口返回了 HTML 而不是 JSON，请检查前端代理和后端服务。";
  }

  return `接口返回了非 JSON 响应：${contentType}`;
}
