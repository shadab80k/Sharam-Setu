import "server-only";
import { createAdminClient } from "@insforge/sdk";

/**
 * Server-only InsForge admin client (service key).
 * All BFF writes/validation flow through this. Never import in client code.
 */
export function getAdminClient() {
  const baseUrl = process.env.INSFORGE_URL || process.env.NEXT_PUBLIC_INSFORGE_URL;
  const apiKey = process.env.INSFORGE_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("Missing INSFORGE_URL / INSFORGE_API_KEY server env");
  }
  return createAdminClient({ baseUrl, apiKey });
}
