import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@insforge/sdk/ssr/middleware";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  try {
    const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_URL;
    const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
    if (baseUrl && anonKey) {
      await updateSession({
        baseUrl,
        anonKey,
        requestCookies: request.cookies,
        responseCookies: response.cookies,
      });
    }
  } catch (error) {
    // Avoid crashing Edge middleware on missing session or network glitch
    console.error("Session refresh skipped in middleware:", error);
  }
  return response;
}

export const config = {
  matcher: [
    // Refresh session on all app pages except static assets & auth API endpoints
    "/((?!_next/static|_next/image|favicon.ico|api/auth/refresh|.*\\.(?:svg|png|jpg|jpeg|webp|ico)).*)",
  ],
};
