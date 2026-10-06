import { getSafeRedirect } from "@/lib/redirect";

export const INVITE_CONTEXT_COOKIE = "kk_invite_context";
export const INVITE_CONTEXT_MAX_AGE = 60 * 60 * 24 * 7;

export function getInviteRedirect(value: string | null | undefined) {
  const safeRedirect = getSafeRedirect(value, "");

  if (!safeRedirect) return null;

  const destination = new URL(safeRedirect, "https://local.invalid");
  const token = destination.searchParams.get("token");

  if (destination.pathname !== "/invite" || !token) return null;

  return `${destination.pathname}${destination.search}`;
}

export function encodeInviteContext(value: string) {
  return encodeURIComponent(value);
}

export function decodeInviteContext(value: string | null | undefined) {
  if (!value) return null;

  try {
    return getInviteRedirect(decodeURIComponent(value));
  } catch {
    return null;
  }
}
