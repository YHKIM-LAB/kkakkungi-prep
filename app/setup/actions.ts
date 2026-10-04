"use server";

import { redirect } from "next/navigation";

import { getPregnancyStartDate } from "@/lib/pregnancy";
import { createClient } from "@/lib/supabase/server";

export type SetupState = { error: string | null };

function readRequiredText(formData: FormData, name: string, label: string) {
  const value = String(formData.get(name) ?? "").trim();

  if (!value) {
    throw new Error(`${label}을(를) 입력해 주세요.`);
  }

  return value;
}

export async function createHousehold(_state: SetupState, formData: FormData): Promise<SetupState> {
  try {
    const householdName = readRequiredText(formData, "householdName", "가족 공간 이름");
    const displayName = readRequiredText(formData, "displayName", "내 이름");
    const babyNickname = readRequiredText(formData, "babyNickname", "태명");
    const dueDate = readRequiredText(formData, "dueDate", "출산 예정일");
    const pregnancyStartDate = getPregnancyStartDate(dueDate);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "로그인이 만료됐어요. 다시 로그인해 주세요." };
    }

    const { data: membership, error: membershipError } = await supabase
      .from("household_members")
      .select()
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      return { error: membershipError.message };
    }

    if (membership) {
      return { error: "이미 가족 공간에 연결되어 있어요. 홈으로 이동해 주세요." };
    }

    const { error } = await supabase.rpc("create_household_with_profile", {
      p_household_name: householdName,
      p_display_name: displayName,
      p_baby_nickname: babyNickname,
      p_due_date: dueDate,
      p_pregnancy_start_date: pregnancyStartDate,
    });

    if (error) {
      return { error: error.message };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "가족 공간을 만들지 못했어요." };
  }

  redirect("/");
}
