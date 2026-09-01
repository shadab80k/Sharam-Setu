import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/server/session";
import { getAdminClient } from "@/lib/server/insforge";

/**
 * POST /api/avatar — upload a profile photo for the signed-in user.
 * The file travels through this server route; the client never receives any
 * storage credentials. Images are validated (type + size) and stored under
 * avatars/<userId>/ so no two users can overwrite each other's photos.
 *
 * Response: { url, key } — the caller (worker/contractor profile PATCH)
 * persists the returned URL as the user's avatar.
 */

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  const { user, response } = await requireRole("worker", "contractor");
  if (!user) return response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a file upload" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size === 0) return NextResponse.json({ error: "File is empty" }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo must be smaller than 2 MB" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG or WebP photos are allowed" }, { status: 400 });
  }

  const admin = getAdminClient();
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.slice(0, 5) : "jpg";
  const key = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  // File carries its own content type; the SDK's upload signature is (path, file)
  const { data, error } = await admin.storage.from("avatars").upload(key, file);
  if (error || !data?.url) {
    return NextResponse.json({ error: error?.message ?? "Upload failed" }, { status: 500 });
  }

  return NextResponse.json({ url: data.url, key: data.key ?? key });
}
