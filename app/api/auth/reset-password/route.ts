import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/server/insforge";

/**
 * POST /api/auth/reset-password — step 2 of the reset flow.
 * Exchanges the 6-digit email code for a one-time reset token,
 * then immediately uses that token to set the new password.
 * The one-time token never leaves the server.
 *
 * On success the user can sign in with the new password — phone OTP
 * and Google login are untouched.
 */

const Body = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
  newPassword: z.string().min(6).max(72),
});

export async function POST(request: NextRequest) {
  const parse = Body.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) {
    return NextResponse.json({ error: "Enter a valid code and a password of at least 6 characters" }, { status: 400 });
  }
  const { email, code, newPassword } = parse.data;
  const normalizedEmail = email.toLowerCase().trim();

  const admin = getAdminClient();

  // 1. Code → one-time reset token (server-side only)
  const { data: exchanged, error: exchangeErr } = await admin.auth.exchangeResetPasswordToken({
    email: normalizedEmail,
    code,
  });
  if (exchangeErr || !exchanged?.token) {
    return NextResponse.json({ error: "That code is invalid or has expired. Request a new one." }, { status: 400 });
  }

  // 2. Token → new password (token consumed here, never returned to the client)
  const { error: resetErr } = await admin.auth.resetPassword({
    newPassword,
    otp: exchanged.token,
  });
  if (resetErr) {
    return NextResponse.json({ error: "Could not reset the password. Please try again." }, { status: 400 });
  }

  return NextResponse.json({ message: "Password updated. You can now sign in with your new password." });
}
