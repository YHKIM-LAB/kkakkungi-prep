"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDisplayNameError, normalizeDisplayName } from "@/lib/display-name";
import { createClient } from "@/lib/supabase/server";

export type InvitationState = {
  error: string | null;
  invitation: { token: string; email: string; expiresAt: string } | null;
};

export type DisplayNameState = { error: string | null };

const initialErrorMap: Record<string, string> = {
  "Only a household owner can create invitations": "가족 공간의 owner만 초대할 수 있어요.",
  "This email is already a household member": "이미 이 가족 공간에 참여 중인 이메일이에요.",
  "An active invitation already exists for this email": "이 이메일로 보낸 유효한 초대가 이미 있어요.",
  "Invalid invitation email": "이메일 주소를 다시 확인해 주세요.",
};

type RpcError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

function getInvitationErrorMessage(error: RpcError) {
  const translated = Object.entries(initialErrorMap).find(([message]) => error.message.includes(message));

  if (translated) return translated[1];

  switch (error.code) {
    case "23505":
      return "같은 이메일의 이전 초대 기록과 충돌했어요. 데이터베이스 업데이트를 확인해 주세요.";
    case "23503":
      return "가족 공간 정보를 확인하지 못했어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.";
    case "42501":
      return "초대 권한이 없어요. 가족 공간의 owner 계정인지 확인해 주세요.";
    case "PGRST202":
      return "초대 기능이 데이터베이스에 아직 반영되지 않았어요.";
    default:
      return "초대 링크를 만들지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
}

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

  if (error) {
    console.error("[create_household_invitation] RPC failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    return {
      error: getInvitationErrorMessage(error),
      invitation: null,
    };
  }

  if (!invitation) {
    console.error("[create_household_invitation] RPC returned no invitation row");
    return {
      error: "초대 정보를 받지 못했어요. 잠시 후 다시 시도해 주세요.",
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

export async function updateOwnDisplayName(
  _state: DisplayNameState,
  formData: FormData,
): Promise<DisplayNameState> {
  const displayName = normalizeDisplayName(formData.get("displayName"));
  const validationError = getDisplayNameError(displayName);

  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 만료됐어요. 다시 로그인해 주세요." };

  const { data: membership, error } = await supabase
    .from("household_members")
    .update({ display_name: displayName })
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    return {
      error: error.code === "42501"
        ? "내 이름만 수정할 수 있어요."
        : "이름을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  if (!membership) return { error: "가족 구성원 정보를 찾지 못했어요." };

  revalidatePath("/family");
  redirect("/family");
}
