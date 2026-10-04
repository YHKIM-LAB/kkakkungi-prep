import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function getSafeRedirect(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/setup";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(getSafeRedirect(url.searchParams.get("next")), url.origin));
    }
  }

  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set("error", "인증 링크를 확인할 수 없습니다.");
  return NextResponse.redirect(loginUrl);
}
