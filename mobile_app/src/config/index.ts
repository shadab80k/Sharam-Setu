/**
 * App configuration — API base URL.
 *
 * Priority:
 *   1. EXPO_PUBLIC_API_BASE env (explicit override)
 *   2. When running in Expo Go over a TUNNEL, derive the backend host from the
 *      manifest debuggerHost (same host that serves the bundle) — this works
 *      on mobile data / different networks.
 *   3. LAN dev: DEBUG_LAN IP (phone + PC on the same Wi-Fi).
 *   4. Production: deployed web URL.
 */
import Constants from "expo-constants";

const DEBUG_LAN = "192.168.1.2";
const DEBUG_PORT = 3002;

function resolveApiBase(): string {
  const env = process.env.EXPO_PUBLIC_API_BASE;
  if (env) return env;

  const manifest = Constants.expoConfig ?? (Constants.manifest as any) ?? null;
  const hostUri: string | undefined =
    manifest?.extra?.apiBase ??
    (Constants.expoGoConfig as any)?.debuggerHost ??
    (manifest?.debuggerHost as string | undefined);

  // Tunnel hosts (*.exp.direct / cloudflare) proxy the BUNDLE port; the backend
  // runs beside Metro on the same machine and is exposed through its own
  // tunnel, baked in via EXPO_PUBLIC_TUNNEL_API when the dev server starts.
  if (hostUri) {
    const host = hostUri.split(":")[0];
    if (/exp\.direct$/.test(host) || /ngrok|trycloudflare/.test(host)) {
      const tunnelApi = process.env.EXPO_PUBLIC_TUNNEL_API;
      if (tunnelApi) return tunnelApi;
    }
  }

  if (process.env.NODE_ENV === "production") return "https://shramsetu.vercel.app";
  return `http://${DEBUG_LAN}:${DEBUG_PORT}`;
}

export const API_BASE = resolveApiBase();

export const STORAGE_COOKIE = "shramsetu.cookies";
export const STORE_PERSIST_KEY = "shramsetu-mobile-v1";

export { Constants };
