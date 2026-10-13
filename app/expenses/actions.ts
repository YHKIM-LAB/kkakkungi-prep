"use server";

import { revalidatePath } from "next/cache";

import { EXPENSE_CATEGORIES } from "@/lib/expenses";
import { isValidDateOnly } from "@/lib/pregnancy";
import { createClient } from "@/lib/supabase/server";

export type ExpenseActionState = { error: string | null; success: boolean };

const fail = (error: string): ExpenseActionState => ({ error, success: false });
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

async function getContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "다시 로그인해 주세요." } as const;

  const { data: member, error } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error || !member) return { ok: false, error: "가족 공간을 확인할 수 없어요." } as const;
  return { ok: true, supabase, householdId: member.household_id } as const;
}

function parseFields(data: FormData) {
  const title = String(data.get("title") ?? "").trim();
  const category = String(data.get("category") ?? "기타").trim();
  const amountText = String(data.get("amount") ?? "").trim();
  const amount = Number(amountText);
  const paid = data.get("paid") === "on";
  const paymentDate = String(data.get("paymentDate") ?? "").trim();
  const memo = String(data.get("memo") ?? "").trim();

  if (!title || Array.from(title).length > 120) return { ok: false, error: "비용 이름은 1~120자로 입력해 주세요." } as const;
  if (!EXPENSE_CATEGORIES.includes(category as (typeof EXPENSE_CATEGORIES)[number])) return { ok: false, error: "분류를 확인해 주세요." } as const;
  if (!/^\d+$/.test(amountText) || !Number.isSafeInteger(amount) || amount < 0 || amount > 999_999_999_999) {
    return { ok: false, error: "금액은 0~999,999,999,999원의 정수로 입력해 주세요." } as const;
  }
  if (paymentDate && !isValidDateOnly(paymentDate)) return { ok: false, error: "결제일을 확인해 주세요." } as const;
  if (Array.from(memo).length > 2000) return { ok: false, error: "메모는 2,000자 이하로 입력해 주세요." } as const;

  return {
    ok: true,
    value: {
      title,
      category,
      amount,
      paid,
      payment_date: paymentDate || null,
      memo: memo || null,
    },
  } as const;
}

async function saveExpense(data: FormData, editing: boolean): Promise<ExpenseActionState> {
  const context = await getContext();
  if (!context.ok) return fail(context.error);

  const parsed = parseFields(data);
  if (!parsed.ok) return fail(parsed.error);

  if (editing) {
    const id = String(data.get("id") ?? "");
    if (!isUuid(id)) return fail("수정할 비용을 확인해 주세요.");

    const { data: changed, error } = await context.supabase
      .from("expenses")
      .update(parsed.value)
      .eq("id", id)
      .eq("household_id", context.householdId)
      .select("id")
      .maybeSingle();

    if (error || !changed) return fail("비용 수정에 실패했어요.");
  } else {
    const { error } = await context.supabase
      .from("expenses")
      .insert({ ...parsed.value, household_id: context.householdId });

    if (error) return fail("비용을 추가하지 못했어요.");
  }

  revalidatePath("/expenses");
  revalidatePath("/");
  return { error: null, success: true };
}

export async function createExpense(_state: ExpenseActionState, data: FormData) {
  return saveExpense(data, false);
}

export async function updateExpense(_state: ExpenseActionState, data: FormData) {
  return saveExpense(data, true);
}

export async function toggleExpensePaid(_state: ExpenseActionState, data: FormData): Promise<ExpenseActionState> {
  const context = await getContext();
  if (!context.ok) return fail(context.error);

  const id = String(data.get("id") ?? "");
  const paid = String(data.get("paid") ?? "");
  if (!isUuid(id) || !["true", "false"].includes(paid)) return fail("변경할 비용을 확인해 주세요.");

  const { data: changed, error } = await context.supabase
    .from("expenses")
    .update({ paid: paid === "true" })
    .eq("id", id)
    .eq("household_id", context.householdId)
    .select("id")
    .maybeSingle();

  if (error || !changed) return fail("결제 상태를 변경하지 못했어요.");

  revalidatePath("/expenses");
  revalidatePath("/");
  return { error: null, success: true };
}

export async function deleteExpense(_state: ExpenseActionState, data: FormData): Promise<ExpenseActionState> {
  const context = await getContext();
  if (!context.ok) return fail(context.error);

  const id = String(data.get("id") ?? "");
  if (!isUuid(id)) return fail("삭제할 비용을 확인해 주세요.");

  const { data: deleted, error } = await context.supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("household_id", context.householdId)
    .select("id")
    .maybeSingle();

  if (error || !deleted) return fail("비용을 삭제하지 못했어요.");

  revalidatePath("/expenses");
  revalidatePath("/");
  return { error: null, success: true };
}
