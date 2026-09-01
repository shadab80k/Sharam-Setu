import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/server/insforge";

/**
 * POST /api/auth/forgot-password — step 1 of the reset flow.
 * Sends a reset code to the email via InsForge Auth's built-in
 * sendResetPasswordEmail (no SMTP config needed from the app).
 *
 * Responds identically whether or not the email exists, so the
 * endpoint can't be used to probe which addresses have accounts.
 */

const Body = z.object({ email: z.string().email() });

// Basic in-memory throttle: 5 requests per email per 15 minutes
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function throttled(email: string): boolean {
  const now = Date.now();
  const entry = attempts.get(email);
  if (!entry || now > entry.resetAt) {
    attempts.set(email, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(request: NextRequest) {
  const parse = Body.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  const email = parse.data.email.toLowerCase().trim();

  if (throttled(email)) {
    return NextResponse.json({ error: "Too many reset requests. Try again in 15 minutes." }, { status: 429 });
  }

  // Confirm the email belongs to an active app user before sending anything
  const admin = getAdminClient();
  const { data: users } = await admin.database
    .from("users")
    .select("id, status")
    .eq("email", email)
    .limit(1);

  if (users?.length && users[0].status === "active") {
    await admin.auth.sendResetPasswordEmail({ email });
  }

  // Same response either way — don't reveal whether the account exists
  return NextResponse.json({
    message: "If an account exists for that email, a reset code has been sent.",
  });
}
