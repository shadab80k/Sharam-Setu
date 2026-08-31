import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { routeAuthActions } from "@/lib/server/auth-actions";
import { getAdminClient } from "@/lib/server/insforge";
import { hashOtp, OTP_MAX_ATTEMPTS } from "@/lib/server/sms/provider";
import {
  hmacPhonePassword, phoneAuthEmail, PHONE_AUTH_EMAIL_DOMAIN, DEMO_PASSWORD,
} from "@/lib/server/sms/credentials";

const Body = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/),
  code: z.string().regex(/^\d{6}$/),
  name: z.string().min(2).max(60).optional(), // signup via OTP
  role: z.enum(["worker", "contractor"]).optional(),
});

export async function POST(request: NextRequest) {
  const parse = Body.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { phone, code, name, role } = parse.data;
  const admin = getAdminClient();

  // ---------- 1. Verify OTP ----------
  const { data: rows } = await admin.database
    .from("otp_codes")
    .select("id, code_hash, expires_at, consumed_at, attempts")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(1);

  const otp = rows?.[0];
  if (!otp || otp.consumed_at) {
    return NextResponse.json({ error: "No active code. Request a new one." }, { status: 400 });
  }
  if (new Date(otp.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 });
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many wrong attempts. Request a new code." }, { status: 429 });
  }
  if (otp.code_hash !== hashOtp(code)) {
    await admin.database.from("otp_codes").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
    return NextResponse.json({ error: "Incorrect code" }, { status: 400 });
  }
  await admin.database.from("otp_codes")
    .update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);

  // ---------- 2. Resolve or create the app user ----------
  const { data: users } = await admin.database
    .from("users")
    .select("id, role, name, email, phone, avatar, location, status")
    .eq("phone", phone)
    .limit(1);
  let appUser = users?.[0];

  if (!appUser) {
    if (!name || !role) {
      return NextResponse.json(
        { error: "New user — name and role required for signup", signupRequired: true },
        { status: 400 }
      );
    }
    const email = phoneAuthEmail(phone);
    const signupClient = getAdminClient();
    const { data: created, error: signupErr } = await signupClient.auth.signUp({
      email,
      password: hmacPhonePassword(phone),
      name,
    });
    if (signupErr || !created?.user?.id) {
      return NextResponse.json({ error: "Account creation failed" }, { status: 500 });
    }
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(/\s/g, "")}`;
    const { data: inserted, error: insErr } = await admin.database
      .from("users")
      .insert([{ id: created.user.id, role, name, email, phone, avatar, location: "lucknow" }])
      .select("id, role, name, email, phone, avatar, location, status");
    if (insErr || !inserted?.length) {
      return NextResponse.json({ error: "Profile creation failed" }, { status: 500 });
    }
    appUser = inserted[0];

    if (role === "worker") {
      await admin.database.from("worker_profiles").insert([{
        user_id: appUser.id, profession: "Helper", bio: "", languages: ["Hindi"],
      }]);
    } else {
      await admin.database.from("contractor_profiles").insert([{ user_id: appUser.id, company_name: name }]);
    }
    // Phone is verified by construction (OTP possession)
    await admin.database.from("verifications").insert([{
      user_id: appUser.id, type: "phone", status: "verified", score: 95,
      verified_at: new Date().toISOString(),
    }]);
    await admin.database.from("notifications").insert([{
      user_id: appUser.id, type: "system", title: "Welcome to ShramSetu!",
      message: "Your account is ready. Complete your profile to boost your trust score.",
      link: role === "worker" ? "/worker/profile" : "/contractor/dashboard",
    }]);
  }

  if (appUser.status !== "active") {
    return NextResponse.json({ error: "Account suspended. Contact support." }, { status: 403 });
  }

  // ---------- 3. Mint session ----------
  const { actions, applyCookies } = routeAuthActions(request);

  // Credential strategy:
  //  - OTP-registered users (phone-scoped email): deterministic HMAC password
  //  - Platform-seeded demo users: known demo password
  const isPhoneScoped = appUser.email.endsWith(PHONE_AUTH_EMAIL_DOMAIN);
  const password = isPhoneScoped ? hmacPhonePassword(phone) : DEMO_PASSWORD;

  const { data: session, error: signInErr } = await actions.signInWithPassword({
    email: appUser.email,
    password,
  });
  if (signInErr || !session?.user?.id) {
    return NextResponse.json(
      { error: "Phone login unavailable for this account — use email login." },
      { status: 401 }
    );
  }
  if (session.user.id !== appUser.id) {
    return NextResponse.json({ error: "Session mismatch" }, { status: 500 });
  }

  return applyCookies(NextResponse.json({ user: appUser }));
}
