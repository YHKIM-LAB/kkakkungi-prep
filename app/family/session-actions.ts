"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { INVITE_CONTEXT_COOKIE } from "@/lib/invite-context";
import { createClient } from "@/lib/supabase/server";

export type SessionActionState = { error: string | null };

export async function endSession(_state: SessionActionState, data: FormData): Promise<SessionActionState> {
  const intent = data.get("intent");
  if (intent !== "logout" && intent !== "switch") {
    return { error: "로그아웃 또는 계정 전환을 선택해 주세요." };
  }

  try {
    const supabase = await createClient();
    // Scope must remain local: do not revoke sessions on the user's other devices.
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return { error: "로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요." };
    const cookieStore = await cookies();
    cookieStore.delete(INVITE_CONTEXT_COOKIE);
  } catch {
    return { error: "로그아웃 처리 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/", "layout");
  redirect(intent === "switch" ? "/login?next=/family" : "/login");
}
