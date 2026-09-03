/**
 * Cookie-jar API client for React Native.
 *
 * The ShramSetu web backend authenticates via InsForge session cookies
 * (sb-* cookies set by /api/auth/login and /api/auth/verify-otp). Native
 * fetch has no cookie jar, so this client:
 *   1. captures Set-Cookie headers from auth endpoints
 *   2. stores them in expo-secure-store
 *   3. attaches them as a Cookie header on every request
 *   4. on 401 → calls /api/auth/refresh once → retries → else clears session
 */
import * as SecureStore from "expo-secure-store";
import { API_BASE, STORAGE_COOKIE } from "../config";

type Jar = Record<string, { value: string; expires?: number }>;

let jar: Jar | null = null;
let restorePromise: Promise<void> | null = null;

async function restore(): Promise<void> {
  if (jar) return;
  if (!restorePromise) {
    restorePromise = (async () => {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_COOKIE);
        jar = raw ? (JSON.parse(raw) as Jar) : {};
      } catch {
        jar = {};
      }
    })();
  }
  await restorePromise;
  restorePromise = null;
}

async function persist(): Promise<void> {
  if (!jar) return;
  await SecureStore.setItemAsync(STORAGE_COOKIE, JSON.stringify(jar));
}

/** Parses set-cookie strings (name=value; Expires=...; Max-Age=...; Path=...). */
function absorbSetCookies(headers: Headers): boolean {
  let changed = false;
  // RN's Headers exposes getSetCookie() when available; fall back to combined header.
  const raw =
    typeof (headers as any).getSetCookie === "function"
      ? (headers as any).getSetCookie() as string[]
      : headers.get("set-cookie")?.split(/,(?=[^;]+?=)/) ?? [];

  for (const line of raw) {
    if (!line) continue;
    const [pair, ...attrs] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq < 1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (!name) continue;

    let expires: number | undefined;
    for (const a of attrs) {
      const [k, v] = a.split("=");
      if (k.trim().toLowerCase() === "max-age" && v) {
        const secs = Number(v.trim());
        if (Number.isFinite(secs) && secs > 0) expires = Date.now() + secs * 1000;
      }
    }

    // Deleted cookies arrive as empty values → drop from the jar.
    if (!value) {
      if (jar && name in jar) {
        delete jar[name];
        changed = true;
      }
      continue;
    }
    if (!jar) jar = {};
    jar[name] = { value, expires };
    changed = true;
  }
  return changed;
}

function cookieHeader(): string {
  if (!jar) return "";
  const now = Date.now();
  return Object.entries(jar)
    .filter(([, c]) => !c.expires || c.expires > now)
    .map(([name, c]) => `${name}=${c.value}`)
    .join("; ");
}

export async function hasSession(): Promise<boolean> {
  await restore();
  const now = Date.now();
  return !!jar && Object.values(jar).some((c) => !c.expires || c.expires > now);
}

export async function clearSession(): Promise<void> {
  await restore();
  jar = {};
  await SecureStore.deleteItemAsync(STORAGE_COOKIE);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type ReqInit = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Skip the 401→refresh→retry loop (used by the refresh call itself). */
  skipRefresh?: boolean;
  /** FormData (avatar upload). */
  formData?: FormData;
};

async function request<T>(path: string, init: ReqInit = {}): Promise<T> {
  await restore();
  const method = init.method ?? "GET";

  const headers: Record<string, string> = {};
  const cookie = cookieHeader();
  if (cookie) headers.Cookie = cookie;
  if (init.formData) headers["Content-Type"] = "multipart/form-data";
  else if (init.body !== undefined) headers["Content-Type"] = "application/json";

  let res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: init.formData ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
  });

  if (absorbSetCookies(res.headers)) await persist();

  // One refresh attempt on 401 (session rotation) — then a single retry.
  if (res.status === 401 && !init.skipRefresh) {
    const refreshed = await request<{ ok?: boolean }>("/api/auth/refresh", {
      method: "POST",
      skipRefresh: true,
    }).then(() => true).catch(() => false);
    if (refreshed) {
      return request<T>(path, { ...init, skipRefresh: true });
    }
    await clearSession();
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export const apiGet = <T>(path: string) => request<T>(path);
export const apiPost = <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body });
export const apiPatch = <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body });
export const apiDelete = <T>(path: string) => request<T>(path, { method: "DELETE" });
export const apiUpload = <T>(path: string, formData: FormData) => request<T>(path, { method: "POST", formData });
