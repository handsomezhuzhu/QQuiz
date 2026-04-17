export const DEFAULT_PAGE_SIZE = 20;

export type SearchParamValue = string | string[] | undefined;

export function parsePositiveInt(
  value: SearchParamValue,
  fallback = 1
): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);

  if (!raw || !Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export function parseOptionalPositiveInt(
  value: SearchParamValue
): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return undefined;
  }

  return Math.floor(parsed);
}

export function getOffset(page: number, pageSize = DEFAULT_PAGE_SIZE) {
  return Math.max(0, page - 1) * pageSize;
}

export function getTotalPages(total: number, pageSize = DEFAULT_PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize));
}
