import { NextResponse } from "next/server";

import { INVITE_CONTEXT_COOKIE } from "@/lib/invite-context";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(INVITE_CONTEXT_COOKIE);
  return response;
}
