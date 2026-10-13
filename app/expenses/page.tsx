import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ExpenseBoard } from "@/components/expenses/expense-board";
import { PageHeading } from "@/components/page-heading";
import { sortExpenses } from "@/lib/expenses";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "비용" };

export default async function ExpensesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/expenses");

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/setup");

  const { data: expenses, error } = await supabase
    .from("expenses")
    .select()
    .eq("household_id", membership.household_id);

  return (
    <div className="subpage expense-page">
      <PageHeading eyebrow="미리 알고 편안하게" title="비용" description="예상 비용과 실제 지출을 함께 보며 준비해요." />
      {error ? (
        <div className="card expense-empty" role="alert">
          비용을 불러오지 못했어요. 잠시 후 페이지를 새로고침해 주세요.
        </div>
      ) : <ExpenseBoard items={sortExpenses(expenses ?? [])} />}
    </div>
  );
}
