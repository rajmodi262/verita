/**
 * Backend API base URL. Set VITE_API_URL at build time for any deployed
 * environment; the localhost fallback is dev-only.
 */
const RAW = import.meta.env.VITE_API_URL;
export const API_BASE = RAW || "http://localhost:8000";

// Loud, non-fatal warning if a production bundle shipped without VITE_API_URL —
// otherwise it silently points at localhost and every request fails with CORS.
if (!RAW && import.meta.env.PROD) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Verita] VITE_API_URL is not set — falling back to http://localhost:8000. " +
      "Set VITE_API_URL at build time for production deployments.",
  );
}
