import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeading } from "@/components/page-heading";
import { ShoppingBoard } from "@/components/shopping/shopping-board";
import { sortShoppingItems } from "@/lib/shopping";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "준비물" };

export default async function ShoppingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/shopping");

  const { data: membership } = await supabase
    .from("household_members")
    .select()
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/setup");

  const { data: items, error: itemsError } = await supabase
    .from("shopping_items")
    .select()
    .eq("household_id", membership.household_id);

  return (
    <div className="subpage shopping-page">
      <PageHeading eyebrow="필요한 만큼만" title="준비물" description="비교하고 결정한 내용을 가족과 같은 목록에서 관리해요." />
      {itemsError ? (
        <div className="card shopping-empty" role="alert">
          <strong>준비물을 불러오지 못했어요.</strong>
          <p>잠시 후 페이지를 새로고침해 주세요.</p>
        </div>
      ) : (
        <ShoppingBoard items={sortShoppingItems(items ?? [])} />
      )}
    </div>
  );
}
