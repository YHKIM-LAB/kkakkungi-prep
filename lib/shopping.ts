import type { PurchaseStatus, ShoppingItem, ShoppingPriority } from "@/types/database";

export const SHOPPING_CATEGORIES = ["수면", "수유", "목욕", "의류", "외출", "위생", "산모용품", "기타"] as const;

export const SHOPPING_PRIORITY_LABELS: Record<ShoppingPriority, string> = {
  high: "필수",
  medium: "있으면 좋음",
  low: "나중에 구매",
};

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  planned: "구매 예정",
  researching: "비교 중",
  purchased: "구매 완료",
};

export const SHOPPING_PRIORITIES = Object.keys(SHOPPING_PRIORITY_LABELS) as ShoppingPriority[];
export const PURCHASE_STATUSES = Object.keys(PURCHASE_STATUS_LABELS) as PurchaseStatus[];

const priorityOrder: Record<ShoppingPriority, number> = { high: 0, medium: 1, low: 2 };

export function sortShoppingItems(items: ShoppingItem[]) {
  return [...items].sort((a, b) => {
    const purchaseOrder = Number(a.purchase_status === "purchased") - Number(b.purchase_status === "purchased");
    if (purchaseOrder !== 0) return purchaseOrder;

    const priorityDifference = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDifference !== 0) return priorityDifference;

    return b.created_at.localeCompare(a.created_at);
  });
}

export function formatWon(value: number) {
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

export function normalizePurchaseUrl(value: string | null) {
  const trimmedValue = value?.trim() ?? "";
  if (!trimmedValue) return { ok: true, value: null } as const;
  if (/\s/.test(trimmedValue) || trimmedValue.startsWith("//") || trimmedValue.includes("\\")) {
    return { ok: false, value: null } as const;
  }

  const hasHttpProtocol = /^https?:\/\//i.test(trimmedValue);
  const hasExplicitScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmedValue);
  if (hasExplicitScheme && !hasHttpProtocol) return { ok: false, value: null } as const;

  const normalizedValue = hasHttpProtocol ? trimmedValue : `https://${trimmedValue}`;

  try {
    const url = new URL(normalizedValue);
    const hasAllowedProtocol = url.protocol === "http:" || url.protocol === "https:";
    const domainLabels = url.hostname.split(".");
    const hasValidDomain = domainLabels.length >= 2 && domainLabels.every((label) => (
      label.length > 0
      && /^[a-z\d-]+$/i.test(label)
      && !label.startsWith("-")
      && !label.endsWith("-")
    ));

    return hasAllowedProtocol && hasValidDomain
      ? { ok: true, value: normalizedValue } as const
      : { ok: false, value: null } as const;
  } catch {
    return { ok: false, value: null } as const;
  }
}

export function getSafePurchaseUrl(value: string | null) {
  const result = normalizePurchaseUrl(value);
  return result.ok ? result.value : null;
}
