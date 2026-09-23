import { NextRequest } from "next/server";

/**
 * Validates the `Authorization: Bearer <ADMIN_TOKEN>` header (or `X-Admin-Token`)
 * against the ADMIN_TOKEN environment variable.
 */
export function isAdminAuthorized(req: NextRequest): boolean {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return false;

  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const xAdminToken = req.headers.get("x-admin-token");

  const provided = bearer ?? xAdminToken;
  if (!provided) return false;

  return timingSafeEqual(provided, adminToken);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
