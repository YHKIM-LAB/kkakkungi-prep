import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SetupForm } from "@/components/setup/setup-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "가족 공간 만들기",
};

export default async function SetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/setup");
  }

  const { data: membership } = await supabase
    .from("household_members")
    .select()
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership) {
    redirect("/");
  }

  const defaultDisplayName = String(user.user_metadata.full_name ?? user.email?.split("@")[0] ?? "");

  return (
    <section className="setup-page">
      <div>
        <p className="eyebrow">첫 번째 준비</p>
        <h1>우리 가족 준비실을<br />만들어 볼까요?</h1>
        <p>가족 정보와 출산 예정일은 같은 가족 공간의 구성원에게만 보여요.</p>
      </div>
      <SetupForm defaultDisplayName={defaultDisplayName} />
    </section>
  );
}
