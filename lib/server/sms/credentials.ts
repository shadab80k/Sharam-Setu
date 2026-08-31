import crypto from "crypto";
import "server-only";

/**
 * Deterministic server-side credential for phone-OTP-registered users.
 * The auth account for phone X always has password = hmacPhonePassword(X),
 * so OTP verification (proof of phone possession) can mint a session
 * without ever storing a password.
 */
export function hmacPhonePassword(phone: string): string {
  const secret = process.env.INSFORGE_API_KEY ?? "shramsetu-dev-secret";
  return `ss-${crypto.createHmac("sha256", secret).update(`phone:${phone}`).digest("hex")}`;
}

export const PHONE_AUTH_EMAIL_DOMAIN = "@phone.shramsetu.app";

export function phoneAuthEmail(phone: string): string {
  return `${phone}${PHONE_AUTH_EMAIL_DOMAIN}`;
}

/** Demo accounts are seeded with this password; phone OTP falls back to it. */
export const DEMO_PASSWORD = "demo1234";
