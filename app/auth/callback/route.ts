import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { decodeInviteContext, getInviteRedirect, INVITE_CONTEXT_COOKIE } from "@/lib/invite-context";
import { getSafeRedirect } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedRedirect = getSafeRedirect(url.searchParams.get("next"), "/setup");
  const requestedInvite = getInviteRedirect(requestedRedirect);
  const cookieStore = await cookies();
  const savedInvite = decodeInviteContext(cookieStore.get(INVITE_CONTEXT_COOKIE)?.value);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(requestedInvite ?? savedInvite ?? requestedRedirect, url.origin));
    }
  }

  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set("error", "인증 링크를 확인할 수 없습니다.");
  return NextResponse.redirect(loginUrl);
}
