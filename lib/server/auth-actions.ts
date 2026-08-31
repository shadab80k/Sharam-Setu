import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createAuthActions } from "@insforge/sdk/ssr";

/**
 * createAuthActions for Next.js Route Handlers: the SDK writes session
 * cookies through the responseCookies writer; we replay them onto the
 * actual NextResponse we return (auth cookies + JSON body together).
 */
export function routeAuthActions(request: NextRequest) {
  interface Jar {
    name: string;
    value: string;
    options?: Record<string, unknown>;
    deleted?: boolean;
  }
  const jar: Jar[] = [];

  const responseCookies = {
    set(...args: unknown[]) {
      const a = args as [string, string, Record<string, unknown>?] | [{ name: string; value: string } & Record<string, unknown>];
      if (typeof a[0] === "string") {
        jar.push({ name: a[0], value: (a[1] as string) ?? "", options: a[2] as Record<string, unknown> });
      } else if (a[0] && typeof a[0] === "object") {
        const o = a[0] as { name: string; value: string } & Record<string, unknown>;
        const { name, value, ...options } = o;
        jar.push({ name, value: value ?? "", options });
      }
    },
    delete(name: string) {
      jar.push({ name, value: "", deleted: true });
    },
  };

  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || "https://6b4vx78a.ap-southeast.insforge.app";
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "anon_14360467e7d161c0fc6f7d1fe89f5734195df8dcc04cc6c5cd8699a10750dfee";

  const actions = createAuthActions({
    baseUrl,
    anonKey,
    requestCookies: request.cookies,
    responseCookies,
  });

  function applyCookies(res: NextResponse) {
    for (const c of jar) {
      if (c.deleted) {
        res.cookies.delete(c.name);
      } else {
        res.cookies.set(c.name as never, c.value as never, (c.options ?? {}) as never);
      }
    }
    return res;
  }

  return { actions, applyCookies };
}
