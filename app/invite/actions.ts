"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { INVITE_CONTEXT_COOKIE } from "@/lib/invite-context";
import { createClient } from "@/lib/supabase/server";

export type AcceptInvitationState = { error: string | null };

const messages: Array<[string, string]> = [
  ["Invitation has already been accepted", "이미 사용된 초대 링크예요."],
  ["Invitation has expired", "초대 링크의 유효기간이 지났어요."],
  ["Invitation has been revoked", "더 이상 사용할 수 없는 초대 링크예요."],
  ["Invitation email does not match", "현재 로그인한 이메일과 초대받은 이메일이 달라요."],
  ["User already belongs to a household", "이미 다른 가족 공간에 참여하고 있어요."],
  ["Invitation not found", "초대 링크를 찾을 수 없어요."],
];

export async function acceptInvitation(
  _state: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  const token = String(formData.get("token") ?? "");

  if (!token) return { error: "초대 링크에 token이 없어요." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "로그인 후 초대를 수락해 주세요." };

  const { error } = await supabase.rpc("accept_household_invitation", { p_token: token });

  if (error) {
    const translated = messages.find(([message]) => error.message.includes(message));
    return { error: translated?.[1] ?? "초대를 수락하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }

  const cookieStore = await cookies();
  cookieStore.delete(INVITE_CONTEXT_COOKIE);
  redirect("/");
}
