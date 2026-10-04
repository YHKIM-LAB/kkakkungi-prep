"use server";

import { createClient } from "@/lib/supabase/server";

export type InvitationState = {
  error: string | null;
  invitation: { token: string; email: string; expiresAt: string } | null;
};

const initialErrorMap: Record<string, string> = {
  "Only a household owner can create invitations": "가족 공간의 owner만 초대할 수 있어요.",
  "This email is already a household member": "이미 이 가족 공간에 참여 중인 이메일이에요.",
  "An active invitation already exists for this email": "이 이메일로 보낸 유효한 초대가 이미 있어요.",
  "Invalid invitation email": "이메일 주소를 다시 확인해 주세요.",
};

export async function createInvitation(
  _state: InvitationState,
  formData: FormData,
): Promise<InvitationState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !email.includes("@") || email.length > 320) {
    return { error: "배우자의 이메일 주소를 확인해 주세요.", invitation: null };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 만료됐어요. 다시 로그인해 주세요.", invitation: null };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("household_members")
    .select()
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    return { error: "가족 공간 정보를 확인하지 못했어요.", invitation: null };
  }

  if (membership.role !== "owner") {
    return { error: "가족 공간의 owner만 초대할 수 있어요.", invitation: null };
  }

  const { data, error } = await supabase.rpc("create_household_invitation", { p_email: email });
  const invitation = data?.[0];

  if (error || !invitation) {
    const translated = Object.entries(initialErrorMap).find(([message]) => error?.message.includes(message));
    return {
      error: translated?.[1] ?? "초대 링크를 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
      invitation: null,
    };
  }

  return {
    error: null,
    invitation: {
      token: invitation.token,
      email: invitation.email,
      expiresAt: invitation.expires_at,
    },
  };
}
