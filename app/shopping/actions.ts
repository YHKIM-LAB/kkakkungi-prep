"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { normalizePurchaseUrl, PURCHASE_STATUSES, SHOPPING_CATEGORIES, SHOPPING_PRIORITIES } from "@/lib/shopping";
import type { PurchaseStatus, ShoppingPriority } from "@/types/database";

export type ShoppingMutationState = { error: string | null; success: boolean };

const failureState = (error: string): ShoppingMutationState => ({ error, success: false });

async function getShoppingContext() {
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

  return { ok: true, supabase, householdId: membership.household_id } as const;
}

function readShoppingFields(formData: FormData) {
  const itemName = String(formData.get("itemName") ?? "").trim();
  const category = String(formData.get("category") ?? "기타");
  const priority = String(formData.get("priority") ?? "medium") as ShoppingPriority;
  const purchaseStatus = String(formData.get("purchaseStatus") ?? "planned") as PurchaseStatus;
  const priceValue = String(formData.get("price") ?? "").trim();
  const purchaseUrlValue = String(formData.get("purchaseUrl") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();

  if (!itemName) return { ok: false, error: "준비물 이름을 입력해 주세요." } as const;
  if (Array.from(itemName).length > 120) return { ok: false, error: "준비물 이름은 120자 이하로 입력해 주세요." } as const;
  if (!SHOPPING_CATEGORIES.includes(category as (typeof SHOPPING_CATEGORIES)[number])) {
    return { ok: false, error: "카테고리를 다시 선택해 주세요." } as const;
  }
  if (!SHOPPING_PRIORITIES.includes(priority)) return { ok: false, error: "우선순위를 다시 선택해 주세요." } as const;
  if (!PURCHASE_STATUSES.includes(purchaseStatus)) return { ok: false, error: "구매 상태를 다시 선택해 주세요." } as const;
  if (Array.from(memo).length > 2_000) return { ok: false, error: "메모는 2,000자 이하로 입력해 주세요." } as const;

  let price: number | null = null;
  if (priceValue) {
    if (!/^\d+$/.test(priceValue)) return { ok: false, error: "가격은 0 이상의 원 단위 정수로 입력해 주세요." } as const;
    price = Number(priceValue);
    if (!Number.isSafeInteger(price) || price > 999_999_999_999) {
      return { ok: false, error: "가격은 999,999,999,999원 이하로 입력해 주세요." } as const;
    }
  }

  const purchaseUrl = normalizePurchaseUrl(purchaseUrlValue);
  if (!purchaseUrl.ok) {
    return { ok: false, error: "구매 링크는 http 또는 https 주소만 사용할 수 있어요." } as const;
  }
  if (purchaseUrl.value && purchaseUrl.value.length > 2_000) {
    return { ok: false, error: "구매 링크가 너무 길어요." } as const;
  }

  return {
    ok: true,
    fields: {
      item_name: itemName,
      category,
      priority,
      purchase_status: purchaseStatus,
      price,
      purchase_url: purchaseUrl.value,
      memo: memo || null,
    },
  } as const;
}

function logShoppingError(operation: string, error: { message: string; code?: string; details?: string; hint?: string }) {
  console.error(`[shopping] ${operation} failed`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
}

function revalidateShopping() {
  revalidatePath("/shopping");
  revalidatePath("/");
}

export async function createShoppingItem(_state: ShoppingMutationState, formData: FormData): Promise<ShoppingMutationState> {
  const context = await getShoppingContext();
  if (!context.ok) return failureState(context.error);

  const parsed = readShoppingFields(formData);
  if (!parsed.ok) return failureState(parsed.error);

  const { error } = await context.supabase.from("shopping_items").insert({
    ...parsed.fields,
    household_id: context.householdId,
  });

  if (error) {
    logShoppingError("create", error);
    return failureState("준비물을 추가하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  revalidateShopping();
  return { error: null, success: true };
}

export async function updateShoppingItem(_state: ShoppingMutationState, formData: FormData): Promise<ShoppingMutationState> {
  const context = await getShoppingContext();
  if (!context.ok) return failureState(context.error);

  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return failureState("수정할 준비물을 찾지 못했어요.");

  const parsed = readShoppingFields(formData);
  if (!parsed.ok) return failureState(parsed.error);

  const { data, error } = await context.supabase
    .from("shopping_items")
    .update(parsed.fields)
    .eq("id", itemId)
    .eq("household_id", context.householdId)
    .select()
    .maybeSingle();

  if (error || !data) {
    if (error) logShoppingError("update", error);
    return failureState("준비물을 수정하지 못했어요. 권한이나 삭제 여부를 확인해 주세요.");
  }

  revalidateShopping();
  return { error: null, success: true };
}

export async function updatePurchaseStatus(_state: ShoppingMutationState, formData: FormData): Promise<ShoppingMutationState> {
  const context = await getShoppingContext();
  if (!context.ok) return failureState(context.error);

  const itemId = String(formData.get("itemId") ?? "");
  const purchaseStatus = String(formData.get("purchaseStatus") ?? "") as PurchaseStatus;
  if (!itemId || !PURCHASE_STATUSES.includes(purchaseStatus)) return failureState("변경할 구매 상태를 확인해 주세요.");

  const { data, error } = await context.supabase
    .from("shopping_items")
    .update({ purchase_status: purchaseStatus })
    .eq("id", itemId)
    .eq("household_id", context.householdId)
    .select()
    .maybeSingle();

  if (error || !data) {
    if (error) logShoppingError("status update", error);
    return failureState("구매 상태를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  revalidateShopping();
  return { error: null, success: true };
}

export async function deleteShoppingItem(_state: ShoppingMutationState, formData: FormData): Promise<ShoppingMutationState> {
  const context = await getShoppingContext();
  if (!context.ok) return failureState(context.error);

  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return failureState("삭제할 준비물을 찾지 못했어요.");

  const { data, error } = await context.supabase
    .from("shopping_items")
    .delete()
    .eq("id", itemId)
    .eq("household_id", context.householdId)
    .select()
    .maybeSingle();

  if (error || !data) {
    if (error) logShoppingError("delete", error);
    return failureState("준비물을 삭제하지 못했어요. 권한이나 삭제 여부를 확인해 주세요.");
  }

  revalidateShopping();
  return { error: null, success: true };
}
