import { NextRequest, NextResponse } from "next/server";
import { routeAuthActions } from "@/lib/server/auth-actions";

export async function POST(request: NextRequest) {
  const { actions, applyCookies } = routeAuthActions(request);
  await actions.signOut();
  return applyCookies(NextResponse.json({ ok: true }));
}
