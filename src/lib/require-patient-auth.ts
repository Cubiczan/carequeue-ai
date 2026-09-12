import { requireAuthResponse } from '@/lib/resilience';

/**
 * Server-side authentication guard for patient-data API routes.
 *
 * Patient records, vitals, and the clinical chat endpoint were previously
 * unauthenticated. This wraps the vendored fail-closed bearer-token check
 * (cubiczan-resilience `requireAuth`): when `PATIENT_API_TOKEN` is unset the
 * guard returns 503 (misconfigured) rather than allowing the request, and a
 * missing/mismatched `Authorization: Bearer <token>` header returns 401.
 *
 * Returns a `Response` to send back when the request is rejected, or `null`
 * when the caller is authorized.
 *
 * NOTE: this is a service-to-service token boundary. If/when a full user
 * session layer (next-auth `getServerSession`) is introduced, swap the body
 * of this helper to derive identity from the session instead — the call sites
 * already centralize on this single guard.
 */
export function requirePatientAuth(request: Request): Response | null {
  return requireAuthResponse(request, {
    token: process.env.PATIENT_API_TOKEN,
  });
}
