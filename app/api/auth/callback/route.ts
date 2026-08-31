import { NextRequest, NextResponse } from "next/server";
import { routeAuthActions } from "@/lib/server/auth-actions";
import { getAdminClient } from "@/lib/server/insforge";

/**
 * Google OAuth callback: exchanges ?insforge_code= for a session, creates the
 * app user row on first login, then lands on the role dashboard.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("insforge_code");
  if (!code) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { actions, applyCookies } = routeAuthActions(request);

  // codeVerifier was set as an httpOnly cookie before redirecting to Google.
  const verifier = request.cookies.get("ss_oauth_verifier")?.value ?? undefined;
  const { data, error } = await actions.exchangeOAuthCode(code, verifier);
  if (error || !data?.user?.id) {
    return applyCookies(NextResponse.redirect(new URL("/?error=oauth", request.url)));
  }

  // Ensure app user row exists (first OAuth login)
  const admin = getAdminClient();
  const { data: existing } = await admin.database
    .from("users")
    .select("id, role, status")
    .eq("id", data.user.id)
    .limit(1);

  if (!existing?.length) {
    const email = data.user.email ?? "";
    const name = (data.user.profile as any)?.name ?? email.split("@")[0] ?? "New User";
    const avatar = (data.user.profile as any)?.avatar_url
      ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(/\s/g, "")}`;
    await admin.database.from("users").insert([{
      id: data.user.id,
      role: "worker",
      name,
      email,
      avatar,
      location: "lucknow",
    }]);
    await admin.database.from("worker_profiles").insert([{ user_id: data.user.id, languages: ["Hindi"] }]);
    await admin.database.from("verifications").insert([{
      user_id: data.user.id, type: "email", status: "verified", score: 95,
      verified_at: new Date().toISOString(),
    }]);
    await admin.database.from("notifications").insert([{
      user_id: data.user.id, type: "system", title: "Welcome to ShramSetu!",
      message: "Your account is ready. Complete your profile to boost your trust score.",
      link: "/worker/profile",
    }]);
    return applyCookies(NextResponse.redirect(new URL("/worker/dashboard", request.url)));
  }

  const role = existing[0].role;
  const path = existing[0].status === "active" ? `/${role}/dashboard` : "/";
  return applyCookies(NextResponse.redirect(new URL(path, request.url)));
}
