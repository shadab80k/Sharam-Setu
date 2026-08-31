import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { getAdminClient } from "@/lib/server/insforge";

/** Current user + full state bootstrap for the client store. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });

  const admin = getAdminClient();
  const { data: rows } = await admin.database
    .from("users")
    .select("id, role, name, email, phone, avatar, location, status, created_at")
    .eq("id", user.id)
    .limit(1);

  return NextResponse.json({ user: rows?.[0] ?? null });
}
