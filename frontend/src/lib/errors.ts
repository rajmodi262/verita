/**
 * Error helpers — strict-TS-safe extraction of a human message from an `unknown`
 * caught value. Use everywhere instead of `catch (e: any) { e.message }`.
 */

/** HTTP error carrying the backend status + parsed `detail` message. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Extract a displayable message from any thrown value (never throws itself). */
export function errMessage(e: unknown, fallback = "Something went wrong"): string {
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === "string") return e || fallback;
  return fallback;
}

/** True when the failure is a network-level reach error (backend offline / CORS). */
export function isOffline(e: unknown): boolean {
  // fetch() rejects with a TypeError when it can't reach the server at all.
  return e instanceof TypeError;
}
