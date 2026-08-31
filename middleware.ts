import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@insforge/sdk/ssr/middleware";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  await updateSession({
    requestCookies: request.cookies,
    responseCookies: response.cookies,
  });
  return response;
}

export const config = {
  matcher: [
    // Refresh session on all app pages except static assets & auth API endpoints
    "/((?!_next/static|_next/image|favicon.ico|api/auth/refresh|.*\\.(?:svg|png|jpg|jpeg|webp|ico)).*)",
  ],
};
