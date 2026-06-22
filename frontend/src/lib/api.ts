/**
 * Typed fetch layer for the Verita backend.
 *
 * Every call goes through `parse()`, which checks `res.ok` BEFORE reading the body —
 * so a 4xx/5xx with a JSON error body can never masquerade as valid data. The
 * backend convention is `{ detail: string }` on errors (FastAPI), which we surface
 * as `ApiError.message`.
 */

import { API_BASE } from "../config";
import { ApiError } from "./errors";

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`.trim();
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (body && typeof body.detail === "string" && body.detail) detail = body.detail;
    } catch {
      /* non-JSON error body — keep the status line */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

/** GET `path` (relative to API_BASE) and return the typed JSON body. Throws ApiError on non-2xx. */
export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { signal });
  return parse<T>(res);
}

/** POST a JSON body to `path` and return the typed JSON response. Throws ApiError on non-2xx. */
export async function apiPost<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  return parse<T>(res);
}

/** POST multipart form data (file uploads) to `path`. Throws ApiError on non-2xx. */
export async function apiUpload<T>(path: string, form: FormData, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", body: form, signal });
  return parse<T>(res);
}
