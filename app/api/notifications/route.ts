import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/session";
import { getAdminClient } from "@/lib/server/insforge";
import * as M from "@/lib/server/mappers";

// POST /api/notifications — mark read / mark all read (own notifications only)
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("mark-read"), notificationId: z.string().uuid() }),
  z.object({ action: z.literal("mark-all-read") }),
]);

export async function POST(request: NextRequest) {
  const { user, response } = await requireRole("worker", "contractor", "admin");
  if (!user) return response;

  const parse = Body.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const admin = getAdminClient();

  if (parse.data.action === "mark-read") {
    const { data, error } = await admin.database
      .from("notifications").update({ read: true })
      .eq("id", parse.data.notificationId)
      .eq("user_id", user.id) // ownership enforced in the update predicate
      .select("id, user_id, type, title, message, read, link, created_at");
    if (error || !data?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ notification: M.mapNotification(data[0]) });
  }

  const { error } = await admin.database
    .from("notifications").update({ read: true }).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
