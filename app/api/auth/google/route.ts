import { NextRequest, NextResponse } from "next/server";
import { routeAuthActions } from "@/lib/server/auth-actions";

/** Initiates Google OAuth: returns the provider URL; verifier stored httpOnly. */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const { actions } = routeAuthActions(request);

  const { data, error } = await actions.signInWithOAuth("google", {
    redirectTo: `${origin}/api/auth/callback`,
    skipBrowserRedirect: true,
  });
  if (error || !data?.url) {
    return NextResponse.redirect(new URL("/?error=oauth-init", request.url));
  }

  const res = NextResponse.redirect(data.url);
  if (data.codeVerifier) {
    res.cookies.set("ss_oauth_verifier", data.codeVerifier, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60,
      path: "/",
    });
  }
  return res;
}
