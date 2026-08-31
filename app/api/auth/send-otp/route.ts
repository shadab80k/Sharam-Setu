import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/server/insforge";
import {
  getSmsProvider, isDevOtpMode, generateOtp, hashOtp,
  OTP_TTL_MINUTES, OTP_RESEND_COOLDOWN_SECONDS,
} from "@/lib/server/sms/provider";

const Body = z.object({ phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number") });

export async function POST(request: NextRequest) {
  const parse = Body.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0]?.message ?? "Invalid phone" }, { status: 400 });
  }
  const { phone } = parse.data;
  const admin = getAdminClient();

  // Rate limit: max 3 OTPs per phone per 10 minutes
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recent } = await admin.database
    .from("otp_codes")
    .select("id")
    .eq("phone", phone)
    .gte("created_at", tenMinAgo)
    .limit(10);
  if ((recent?.length ?? 0) >= 3) {
    return NextResponse.json(
      { error: "Too many OTP requests. Try again in a few minutes." },
      { status: 429 }
    );
  }

  // Cooldown: block resend within 60s of last OTP
  const { data: last } = await admin.database
    .from("otp_codes")
    .select("id, created_at")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(1);
  if (last?.length) {
    const age = (Date.now() - new Date(last[0].created_at).getTime()) / 1000;
    if (age < OTP_RESEND_COOLDOWN_SECONDS) {
      return NextResponse.json(
        { error: `Please wait ${Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - age)}s before requesting a new code` },
        { status: 429 }
      );
    }
  }

  const code = generateOtp();
  const sms = getSmsProvider();
  const dev = isDevOtpMode();
  await sms.send(phone, `Your ShramSetu verification code is ${code}. Valid for ${OTP_TTL_MINUTES} minutes. Never share it.`);

  const { error } = await admin.database.from("otp_codes").insert([{
    phone,
    code_hash: hashOtp(code),
    expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString(),
    ip: request.headers.get("x-forwarded-for") ?? undefined,
  }]);
  if (error) return NextResponse.json({ error: "Could not send OTP" }, { status: 500 });

  return NextResponse.json({
    sent: true,
    devOtp: dev ? code : undefined,
    expiresInMinutes: OTP_TTL_MINUTES,
  });
}
