"use server";

import { revalidatePath } from "next/cache";

import { getPregnancyWeekForDate, isValidDateOnly } from "@/lib/pregnancy";
import { createClient } from "@/lib/supabase/server";
import { TASK_CATEGORIES, TASK_STATUSES } from "@/lib/tasks";
import type { TaskStatus } from "@/types/database";

export type TaskMutationState = { error: string | null; success: boolean };

const failureState = (error: string): TaskMutationState => ({ error, success: false });

async function getTaskContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 만료됐어요. 다시 로그인해 주세요." } as const;

  const { data: membership, error: membershipError } = await supabase
    .from("household_members")
    .select()
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    return { ok: false, error: "가족 공간 정보를 확인하지 못했어요." } as const;
  }

  const { data: profile } = await supabase
    .from("pregnancy_profile")
    .select()
    .eq("household_id", membership.household_id)
    .maybeSingle();

  return {
    ok: true,
    supabase,
    userId: user.id,
    householdId: membership.household_id,
    profileDueDate: profile?.due_date ?? null,
  } as const;
}

function readTaskFields(formData: FormData, profileDueDate: string | null, includeStatus: boolean) {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "기타");
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const weekValue = String(formData.get("pregnancyWeek") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();
  const statusValue = includeStatus ? String(formData.get("status") ?? "todo") : "todo";

  if (!title) return { ok: false, error: "할 일 제목을 입력해 주세요." } as const;
  if (Array.from(title).length > 120) return { ok: false, error: "제목은 120자 이하로 입력해 주세요." } as const;
  if (!TASK_CATEGORIES.includes(category as (typeof TASK_CATEGORIES)[number])) {
    return { ok: false, error: "카테고리를 다시 선택해 주세요." } as const;
  }
  if (dueDate && !isValidDateOnly(dueDate)) {
    return { ok: false, error: "날짜를 다시 확인해 주세요." } as const;
  }
  if (!TASK_STATUSES.includes(statusValue as TaskStatus)) {
    return { ok: false, error: "상태를 다시 선택해 주세요." } as const;
  }
  if (Array.from(memo).length > 2000) return { ok: false, error: "메모는 2,000자 이하로 입력해 주세요." } as const;

  let pregnancyWeek: number | null = null;
  if (weekValue) {
    pregnancyWeek = Number(weekValue);
    if (!Number.isInteger(pregnancyWeek) || pregnancyWeek < 0 || pregnancyWeek > 45) {
      return { ok: false, error: "임신 주차는 0주부터 45주 사이로 입력해 주세요." } as const;
    }
  } else if (dueDate && profileDueDate) {
    try {
      pregnancyWeek = getPregnancyWeekForDate(profileDueDate, dueDate);
    } catch {
      return { ok: false, error: "날짜를 다시 확인해 주세요." } as const;
    }
  }

  return {
    ok: true,
    fields: {
      title,
      category,
      due_date: dueDate || null,
      pregnancy_week: pregnancyWeek,
      memo: memo || null,
      status: statusValue as TaskStatus,
    },
  } as const;
}

function logTaskError(operation: string, error: { message: string; code?: string; details?: string; hint?: string }) {
  console.error(`[tasks] ${operation} failed`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
}

export async function createTask(_state: TaskMutationState, formData: FormData): Promise<TaskMutationState> {
  const context = await getTaskContext();
  if (!context.ok) return failureState(context.error);

  const parsed = readTaskFields(formData, context.profileDueDate, false);
  if (!parsed.ok) return failureState(parsed.error);

  const { error } = await context.supabase.from("tasks").insert({
    ...parsed.fields,
    household_id: context.householdId,
    created_by: context.userId,
  });

  if (error) {
    logTaskError("create", error);
    return failureState("할 일을 추가하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  revalidatePath("/tasks");
  revalidatePath("/");
  return { error: null, success: true };
}

export async function updateTask(_state: TaskMutationState, formData: FormData): Promise<TaskMutationState> {
  const context = await getTaskContext();
  if (!context.ok) return failureState(context.error);

  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return failureState("수정할 할 일을 찾지 못했어요.");

  const parsed = readTaskFields(formData, context.profileDueDate, true);
  if (!parsed.ok) return failureState(parsed.error);

  const { data, error } = await context.supabase
    .from("tasks")
    .update(parsed.fields)
    .eq("id", taskId)
    .eq("household_id", context.householdId)
    .select()
    .maybeSingle();

  if (error || !data) {
    if (error) logTaskError("update", error);
    return failureState("할 일을 수정하지 못했어요. 권한이나 삭제 여부를 확인해 주세요.");
  }

  revalidatePath("/tasks");
  revalidatePath("/");
  return { error: null, success: true };
}

export async function updateTaskStatus(_state: TaskMutationState, formData: FormData): Promise<TaskMutationState> {
  const context = await getTaskContext();
  if (!context.ok) return failureState(context.error);

  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "") as TaskStatus;
  if (!taskId || !TASK_STATUSES.includes(status)) return failureState("변경할 상태를 확인해 주세요.");

  const { data, error } = await context.supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId)
    .eq("household_id", context.householdId)
    .select()
    .maybeSingle();

  if (error || !data) {
    if (error) logTaskError("status update", error);
    return failureState("상태를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  revalidatePath("/tasks");
  revalidatePath("/");
  return { error: null, success: true };
}

export async function deleteTask(_state: TaskMutationState, formData: FormData): Promise<TaskMutationState> {
  const context = await getTaskContext();
  if (!context.ok) return failureState(context.error);

  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return failureState("삭제할 할 일을 찾지 못했어요.");

  const { data, error } = await context.supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("household_id", context.householdId)
    .select()
    .maybeSingle();

  if (error || !data) {
    if (error) logTaskError("delete", error);
    return failureState("할 일을 삭제하지 못했어요. 권한이나 삭제 여부를 확인해 주세요.");
  }

  revalidatePath("/tasks");
  revalidatePath("/");
  return { error: null, success: true };
}
