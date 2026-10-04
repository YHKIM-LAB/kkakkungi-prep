import Link from "next/link";
import { redirect } from "next/navigation";

import { SectionCard } from "@/components/section-card";
import { getPregnancyProgress } from "@/lib/pregnancy";
import { createClient } from "@/lib/supabase/server";

const weeklyTasks = [
  { title: "태아보험 알아보기", category: "보험", done: false },
  { title: "출산병원 후보 정리", category: "병원", done: true },
  { title: "다음 산부인과 일정 확인", category: "일정", done: false },
];

const upcomingSchedules = [
  { date: "10.08", weekday: "목", title: "다음 산부인과 진료", note: "오전 10:30 · 햇살여성병원" },
  { date: "10.22", weekday: "목", title: "NIPT 검토", note: "10주차 · 검사 여부 결정" },
  { date: "11.05", weekday: "목", title: "1차 기형아 검사", note: "12주차 · 예약 확인 필요" },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("household_members")
    .select()
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/setup");
  }

  const { data: profile } = await supabase
    .from("pregnancy_profile")
    .select()
    .eq("household_id", membership.household_id)
    .maybeSingle();

  if (!profile) {
    redirect("/setup");
  }

  const pregnancy = getPregnancyProgress(profile.due_date);
  const dDay = pregnancy.daysUntilDue >= 0 ? `D-${pregnancy.daysUntilDue}` : `D+${Math.abs(pregnancy.daysUntilDue)}`;

  return (
    <div className="dashboard">
      <section className="hero-card">
        <div className="hero-card__content">
          <p className="eyebrow">오늘의 까꿍이</p>
          <h1>{profile.baby_nickname} <span aria-hidden="true">👶</span></h1>
          <p className="hero-card__lead">조금씩 자라고, 함께 준비하고 있어요.</p>
          <div className="pregnancy-stat" aria-label={`현재 임신 ${pregnancy.weeks}주 ${pregnancy.days}일, ${dDay}`}>
            <strong>{pregnancy.weeks}주 {pregnancy.days}일</strong>
            <span aria-hidden="true" />
            <strong>{dDay}</strong>
          </div>
        </div>
        <div className="week-orbit" aria-hidden="true">
          <span>{pregnancy.weeks}</span>
          <small>WEEK</small>
        </div>
      </section>

      <div className="dashboard__grid">
        <SectionCard
          title="이번 주 할 일"
          description="이번 주에 둘이 챙길 3가지"
          trailing={<Link className="text-link" href="/tasks">전체 보기</Link>}
          className="dashboard__tasks"
        >
          <ul className="task-list">
            {weeklyTasks.map((task) => (
              <li key={task.title} className={task.done ? "is-done" : undefined}>
                <input type="checkbox" defaultChecked={task.done} aria-label={`${task.title} 완료 여부`} />
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.category}</span>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="다음 주요 일정"
          description="가까운 일정을 미리 확인해요"
          trailing={<Link className="text-link" href="/schedule">전체 보기</Link>}
          className="dashboard__schedule"
        >
          <ol className="schedule-list">
            {upcomingSchedules.map((schedule, index) => (
              <li key={schedule.title}>
                <div className="schedule-date">
                  <strong>{schedule.date}</strong>
                  <span>{schedule.weekday}</span>
                </div>
                <div className="schedule-line" aria-hidden="true"><span>{index + 1}</span></div>
                <div>
                  <strong>{schedule.title}</strong>
                  <p>{schedule.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>

        <SectionCard title="출산 준비 진행률" description="전체 준비 항목 기준" className="dashboard__progress">
          <div className="progress-summary">
            <strong>38<span>%</span></strong>
            <p>지난주보다 <b>6%</b> 더 준비했어요</p>
          </div>
          <div className="progress-track" role="progressbar" aria-label="출산 준비 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={38}>
            <span style={{ width: "38%" }} />
          </div>
        </SectionCard>

        <div className="metric-grid">
          <Link href="/shopping" className="metric-card metric-card--peach">
            <span className="metric-card__icon" aria-hidden="true">⌂</span>
            <span>구매 준비</span>
            <strong>12 <small>/ 64개</small></strong>
            <em>52개 남았어요</em>
          </Link>
          <Link href="/expenses" className="metric-card metric-card--yellow">
            <span className="metric-card__icon" aria-hidden="true">₩</span>
            <span>예상 비용</span>
            <strong>4,820,000<small>원</small></strong>
            <em>현재 지출 680,000원</em>
          </Link>
        </div>
      </div>
    </div>
  );
}
