import "server-only";
import crypto from "crypto";

/**
 * SMS provider abstraction — swap-ready for production providers.
 * Dev mode: OTP is returned in the API response + logged, so the demo
 * works with zero cost. When MSG91/Twilio keys are added to env, the
 * provider below switches automatically — no code changes elsewhere.
 */

export interface SmsProvider {
  name: string;
  send(to: string, message: string): Promise<{ delivered: boolean; providerId?: string }>;
}

class DevSmsProvider implements SmsProvider {
  name = "dev";
  async send(to: string, message: string) {
    console.log(`[DEV SMS] to=${to} :: ${message}`);
    return { delivered: true };
  }
}

class Msg91Provider implements SmsProvider {
  name = "msg91";
  constructor(
    private authKey: string,
    private templateId: string,
    private senderId: string
  ) {}
  async send(to: string, message: string) {
    const res = await fetch("https://api.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: { authkey: this.authKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        template_id: this.templateId,
        sender: this.senderId,
        mobiles: `91${to}`,
        OTP: message.match(/\d{6}/)?.[0] ?? "",
      }),
    });
    return { delivered: res.ok, providerId: (await res.json())?.request_id };
  }
}

class TwilioProvider implements SmsProvider {
  name = "twilio";
  constructor(
    private accountSid: string,
    private authToken: string,
    private from: string
  ) {}
  async send(to: string, message: string) {
    const sid = this.accountSid;
    const body = new URLSearchParams({
      To: `+91${to}`,
      From: this.from,
      Body: message,
    });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${this.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    return { delivered: res.ok, providerId: (await res.json())?.sid };
  }
}

export function getSmsProvider(): SmsProvider {
  if (process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID && process.env.MSG91_SENDER_ID) {
    return new Msg91Provider(
      process.env.MSG91_AUTH_KEY,
      process.env.MSG91_TEMPLATE_ID,
      process.env.MSG91_SENDER_ID
    );
  }
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) {
    return new TwilioProvider(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
      process.env.TWILIO_FROM
    );
  }
  return new DevSmsProvider();
}

/** Dev mode flag: exposed to client so the OTP can be shown in the UI. */
export function isDevOtpMode(): boolean {
  // Dev OTP only when explicitly enabled AND no real SMS provider is configured.
  return (
    process.env.NEXT_PUBLIC_DEV_OTP_MODE === "true" &&
    !(process.env.MSG91_AUTH_KEY || process.env.TWILIO_ACCOUNT_SID)
  );
}

export function generateOtp(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(`${code}:${process.env.INSFORGE_API_KEY}`).digest("hex");
}

export const OTP_TTL_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
