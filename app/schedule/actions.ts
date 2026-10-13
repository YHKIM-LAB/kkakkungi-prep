"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPregnancyWeekForDate, isValidDateOnly } from "@/lib/pregnancy";

export type ScheduleActionState = { error: string | null; success: boolean };
const fail = (error: string): ScheduleActionState => ({ error, success: false });

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "다시 로그인해 주세요." } as const;
  const { data: member, error } = await supabase.from("household_members").select("household_id").eq("user_id", user.id).maybeSingle();
  if (error || !member) return { ok: false, error: "가족 공간을 확인할 수 없어요." } as const;
  return { ok: true, supabase, userId: user.id, householdId: member.household_id } as const;
}

function fields(data: FormData) {
  const title = String(data.get("title") ?? "").trim();
  const date = String(data.get("date") ?? "").trim();
  const category = String(data.get("category") ?? "기타").trim();
  const memo = String(data.get("memo") ?? "").trim();
  if (!title || Array.from(title).length > 120) return { ok: false, error: "일정 제목은 1~120자로 입력해 주세요." } as const;
  if (!isValidDateOnly(date)) return { ok: false, error: "날짜를 확인해 주세요." } as const;
  if (!["진료", "검사", "예약", "준비", "기타"].includes(category)) return { ok: false, error: "분류를 확인해 주세요." } as const;
  if (Array.from(memo).length > 2000) return { ok: false, error: "메모는 2,000자 이하로 입력해 주세요." } as const;
  return { ok: true, value: { title, date, category, memo: memo || null } } as const;
}
async function save(state: ScheduleActionState, data: FormData, editing: boolean): Promise<ScheduleActionState> {
  const ctx = await context();
  if (!ctx.ok) return fail(ctx.error);
  const parsed = fields(data);
  if (!parsed.ok) return fail(parsed.error);
  const { data: profile, error: profileError } = await ctx.supabase.from("pregnancy_profile").select("due_date").eq("household_id", ctx.householdId).maybeSingle();
  if (profileError || !profile) return fail("임신 정보를 확인할 수 없어요.");
  const values = { ...parsed.value, pregnancy_week: getPregnancyWeekForDate(profile.due_date, parsed.value.date) };
  if (editing) {
    const id = String(data.get("id") ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("수정할 일정을 확인해 주세요.");
    const { data: changed, error } = await ctx.supabase.from("schedules").update(values).eq("id", id).eq("household_id", ctx.householdId).select("id").maybeSingle();
    if (error || !changed) return fail("일정 수정에 실패했어요.");
  } else {
    const { error } = await ctx.supabase.from("schedules").insert({ ...values, household_id: ctx.householdId, created_by: ctx.userId });
    if (error) return fail("일정을 추가하지 못했어요.");
  }
  revalidatePath("/schedule");
  revalidatePath("/");
  return { error: null, success: true };
}
export async function createSchedule(state: ScheduleActionState, data: FormData) { return save(state, data, false); }
export async function updateSchedule(state: ScheduleActionState, data: FormData) { return save(state, data, true); }
export async function deleteSchedule(_state: ScheduleActionState, data: FormData): Promise<ScheduleActionState> {
  const ctx = await context();
  if (!ctx.ok) return fail(ctx.error);
  const id = String(data.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("삭제할 일정을 확인해 주세요.");
  const { data: deleted, error } = await ctx.supabase.from("schedules").delete().eq("id", id).eq("household_id", ctx.householdId).select("id").maybeSingle();
  if (error || !deleted) return fail("일정을 삭제하지 못했어요.");
  revalidatePath("/schedule");
  revalidatePath("/");
  return { error: null, success: true };
}
