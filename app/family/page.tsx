import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DisplayNameEditor } from "@/components/family/display-name-editor";
import { InviteForm } from "@/components/family/invite-form";
import { SectionCard } from "@/components/section-card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "가족 설정" };

export default async function FamilyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/family");

  const { data: membership } = await supabase
    .from("household_members")
    .select()
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/setup");

  const [{ data: household }, { data: profile }, { data: members }] = await Promise.all([
    supabase.from("households").select().eq("id", membership.household_id).maybeSingle(),
    supabase.from("pregnancy_profile").select().eq("household_id", membership.household_id).maybeSingle(),
    supabase.from("household_members").select().eq("household_id", membership.household_id).order("created_at"),
  ]);

  if (!household || !profile) redirect("/setup");

  return (
    <div className="subpage family-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">함께 쓰는 준비실</p>
          <h1>가족 설정</h1>
          <p className="page-heading__description">가족 공간과 함께하는 구성원을 확인해요.</p>
        </div>
      </header>

      <section className="family-summary" aria-label="가족 공간 정보">
        <div><span>가족 공간</span><strong>{household.name}</strong></div>
        <div><span>태명</span><strong>{profile.baby_nickname}</strong></div>
      </section>

      <SectionCard title="함께하는 가족" description={`${members?.length ?? 0}명이 같은 준비실을 사용하고 있어요.`}>
        <ul className="member-list">
          {(members ?? []).map((member) => (
            <li key={member.id}>
              <span className="member-avatar" aria-hidden="true">{member.display_name.slice(0, 1)}</span>
              {member.user_id === user.id ? (
                <DisplayNameEditor currentName={member.display_name} />
              ) : (
                <div><strong>{member.display_name}</strong><span>가족 구성원</span></div>
              )}
              <span className={`role-badge role-badge--${member.role}`}>{member.role}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="배우자 초대하기"
        description="초대를 수락하면 같은 준비실을 함께 사용할 수 있어요."
      >
        {membership.role === "owner" ? (
          <InviteForm />
        ) : (
          <p className="family-notice">초대 링크는 가족 공간의 owner가 만들 수 있어요.</p>
        )}
      </SectionCard>
    </div>
  );
}
