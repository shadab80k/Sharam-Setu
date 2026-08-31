import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/server/insforge";
import { routeAuthActions } from "@/lib/server/auth-actions";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const parse = Body.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid credentials format" }, { status: 400 });
  }
  const { email, password } = parse.data;

  const { actions, applyCookies } = routeAuthActions(request);
  const { data: session, error } = await actions.signInWithPassword({ email, password });
  if (error || !session?.user?.id) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Load the app user (checks suspension + role)
  const admin = getAdminClient();
  const { data: users } = await admin.database
    .from("users")
    .select("id, role, name, email, phone, avatar, location, status")
    .eq("id", session.user.id)
    .limit(1);
  if (!users?.length) {
    return NextResponse.json({ error: "Account profile missing" }, { status: 500 });
  }
  if (users[0].status !== "active") {
    return NextResponse.json({ error: "Account suspended. Contact support." }, { status: 403 });
  }

  return applyCookies(NextResponse.json({ user: users[0] }));
}
