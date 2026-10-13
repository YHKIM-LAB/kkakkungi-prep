import type { Expense } from "@/types/database";

export const EXPENSE_CATEGORIES = ["의료", "건강", "보험", "출산", "육아", "기타"] as const;

export function sortExpenses(items: Expense[]) {
  return [...items].sort((a, b) => {
    const dateDifference = (b.payment_date ?? "").localeCompare(a.payment_date ?? "");
    return dateDifference || b.created_at.localeCompare(a.created_at);
  });
}

export function getExpenseSummary(items: Expense[]) {
  let total = 0;
  let paid = 0;

  for (const item of items) {
    total += item.amount;
    if (item.paid) paid += item.amount;
  }

  return {
    total,
    paid,
    remaining: Math.max(0, total - paid),
    progress: total ? Math.min(100, Math.round((paid / total) * 100)) : 0,
  };
}
