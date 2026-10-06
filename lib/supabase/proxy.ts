import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  decodeInviteContext,
  encodeInviteContext,
  getInviteRedirect,
  INVITE_CONTEXT_COOKIE,
  INVITE_CONTEXT_MAX_AGE,
} from "@/lib/invite-context";
import { getSafeRedirect } from "@/lib/redirect";
import type { Database } from "@/types/database";

const PUBLIC_PATHS = ["/login", "/invite", "/auth/callback", "/auth/invite-context"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname, search } = request.nextUrl;
  const requestedRedirect = getSafeRedirect(request.nextUrl.searchParams.get("next"), "/setup");
  const requestedInvite = getInviteRedirect(requestedRedirect);
  const savedInvite = decodeInviteContext(request.cookies.get(INVITE_CONTEXT_COOKIE)?.value);

  if (!user && pathname === "/login" && requestedInvite) {
    response.cookies.set(INVITE_CONTEXT_COOKIE, encodeInviteContext(requestedInvite), {
      httpOnly: true,
      maxAge: INVITE_CONTEXT_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
  }

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL(requestedInvite ?? savedInvite ?? requestedRedirect, request.url));
  }

  if (user && savedInvite && pathname === "/setup") {
    return NextResponse.redirect(new URL(savedInvite, request.url));
  }

  return response;
}
