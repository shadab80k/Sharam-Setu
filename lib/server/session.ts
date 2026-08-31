import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@insforge/sdk/ssr";
import type { Role } from "@/lib/types";

export interface SessionUser {
  id: string;
  role: Role;
  name: string;
  email: string;
  status: "active" | "suspended";
}

/**
 * Reads the signed-in user from the InsForge session cookie (server side).
 * Returns null when unauthenticated. Verifies role + status against public.users
 * so suspended users and forged roles are rejected.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
    const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
    if (!baseUrl || !anonKey) return null;
    const supabase = createServerClient({
      baseUrl,
      anonKey,
      cookies: await cookies(),
    });
    const { data, error } = await supabase.auth.getCurrentUser();
    if (error || !data?.user?.id) return null;

    const { getAdminClient } = await import("@/lib/server/insforge");
    const admin = getAdminClient();
    const { data: rows, error: userErr } = await admin.database
      .from("users")
      .select("id, role, name, email, status")
      .eq("id", data.user.id)
      .limit(1);
    if (userErr || !rows?.length) return null;
    const u = rows[0];
    if (u.status !== "active") return null;
    return { id: u.id, role: u.role as Role, name: u.name, email: u.email, status: u.status };
  } catch {
    return null;
  }
}

/** 401 helper */
export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** 403 helper */
export function forbidden(msg = "Forbidden") {
  return NextResponse.json({ error: msg }, { status: 403 });
}

/**
 * Route guard: resolves the session user and enforces one of the allowed roles.
 * Returns either a NextResponse (error) or the session user.
 */
export async function requireRole(
  ...roles: Role[]
): Promise<{ user: SessionUser; response: null } | { user: null; response: NextResponse }> {
  const user = await getSessionUser();
  if (!user) return { user: null, response: unauthorized() };
  if (roles.length && !roles.includes(user.role)) {
    return { user: null, response: forbidden(`Requires role: ${roles.join(" or ")}`) };
  }
  return { user, response: null };
}

export async function requireAdmin() {
  return requireRole("admin");
}
