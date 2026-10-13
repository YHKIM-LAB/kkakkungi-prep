import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/page-heading";
import { ScheduleBoard } from "@/components/schedule/schedule-board";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "일정" };

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/schedule");
  const { data: membership } = await supabase.from("household_members").select("household_id").eq("user_id", user.id).maybeSingle();
  if (!membership) redirect("/setup");
  const { data: schedules, error } = await supabase.from("schedules").select().eq("household_id", membership.household_id).order("date", { ascending: true });
  return <div className="subpage schedule-page">
    <PageHeading eyebrow="다가오는 순간들" title="일정" description="진료, 검사, 예약과 준비 일정을 가족과 함께 관리해요." />
    {error ? <div className="card schedule-empty" role="alert">일정 목록을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.</div> : <ScheduleBoard items={schedules ?? []} />}
  </div>;
}
