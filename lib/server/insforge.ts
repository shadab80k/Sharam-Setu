import "server-only";
import { createAdminClient } from "@insforge/sdk";

/**
 * Server-only InsForge admin client (service key).
 * All BFF writes/validation flow through this. Never import in client code.
 */
const DEFAULT_URL = "https://6b4vx78a.ap-southeast.insforge.app";
const DEFAULT_KEY = "ik_2063fcb27fb65c187f0aca0051c03ab9";

export function getAdminClient() {
  const baseUrl = process.env.INSFORGE_URL || process.env.NEXT_PUBLIC_INSFORGE_URL || DEFAULT_URL;
  const apiKey = process.env.INSFORGE_API_KEY || DEFAULT_KEY;
  return createAdminClient({ baseUrl, apiKey });
}
