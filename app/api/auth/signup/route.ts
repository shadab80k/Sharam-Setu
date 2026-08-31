import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { routeAuthActions } from "@/lib/server/auth-actions";
import { getAdminClient } from "@/lib/server/insforge";

const Body = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  role: z.enum(["worker", "contractor"]),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional().or(z.literal("")),
  location: z.string().min(2).max(30).default("lucknow"),
});

export async function POST(request: NextRequest) {
  const parse = Body.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) {
    return NextResponse.json(
      { error: parse.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { name, email, password, role, phone, location } = parse.data;
  const admin = getAdminClient();

  // Duplicate app-user guard (auth duplicate errors come from signUp anyway)
  const { data: existing } = await admin.database
    .from("users")
    .select("id")
    .eq("email", email)
    .limit(1);
  if (existing?.length) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  // 1. Create auth user (isolated client — session pollution guard)
  const signupClient = getAdminClient();
  const { data: created, error: signupErr } = await signupClient.auth.signUp({ email, password, name });
  if (signupErr || !created?.user?.id) {
    return NextResponse.json(
      { error: signupErr?.message ?? "Signup failed" },
      { status: 400 }
    );
  }

  // 2. Insert app row + role profile
  const avatar = `https://api.dicebear.com/7.x/${role === "worker" ? "avataaars" : "initials"}/svg?seed=${name.replace(/\s/g, "")}`;
  const { data: appUser, error: insErr } = await admin.database
    .from("users")
    .insert([{ id: created.user.id, role, name, email, phone: phone || null, avatar, location }])
    .select("id, role, name, email, phone, avatar, location, status");
  if (insErr || !appUser?.length) {
    return NextResponse.json({ error: "Profile creation failed" }, { status: 500 });
  }

  if (role === "worker") {
    await admin.database.from("worker_profiles").insert([{ user_id: appUser[0].id, languages: ["Hindi"] }]);
  } else {
    await admin.database.from("contractor_profiles").insert([{ user_id: appUser[0].id, company_name: name, location }]);
  }

  await admin.database.from("verifications").insert([{
    user_id: appUser[0].id, type: "email", status: "verified", score: 95,
    verified_at: new Date().toISOString(),
  }]);
  await admin.database.from("notifications").insert([{
    user_id: appUser[0].id, type: "system", title: "Welcome to ShramSetu!",
    message: "Your account is ready. Complete your profile to boost your trust score.",
    link: role === "worker" ? "/worker/profile" : "/contractor/dashboard",
  }]);

  // 3. Mint session
  const { actions, applyCookies } = routeAuthActions(request);
  const { data: session, error: signInErr } = await actions.signInWithPassword({ email, password });
  if (signInErr) {
    return NextResponse.json({ user: appUser[0], warning: "Signed up — please log in" });
  }

  return applyCookies(NextResponse.json({ user: appUser[0] }));
}
