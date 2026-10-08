import Link from "next/link";
import { redirect } from "next/navigation";

import { SectionCard } from "@/components/section-card";
import { getPregnancyProgress } from "@/lib/pregnancy";
import { sortShoppingItems } from "@/lib/shopping";
import { createClient } from "@/lib/supabase/server";
import { formatTaskDate, sortTasks, TASK_STATUS_LABELS } from "@/lib/tasks";

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

  const [{ data: profile }, { data: tasks, error: tasksError }, { data: shoppingItems, error: shoppingError }] = await Promise.all([
    supabase.from("pregnancy_profile").select().eq("household_id", membership.household_id).maybeSingle(),
    supabase.from("tasks").select().eq("household_id", membership.household_id),
    supabase.from("shopping_items").select().eq("household_id", membership.household_id),
  ]);

  if (!profile) {
    redirect("/setup");
  }

  const pregnancy = getPregnancyProgress(profile.due_date);
  const dDay = pregnancy.daysUntilDue >= 0 ? `D-${pregnancy.daysUntilDue}` : `D+${Math.abs(pregnancy.daysUntilDue)}`;
  const allTasks = tasks ?? [];
  const upcomingTasks = sortTasks(allTasks.filter((task) => task.status !== "done")).slice(0, 3);
  const completedTaskCount = allTasks.filter((task) => task.status === "done").length;
  const taskProgress = allTasks.length ? Math.round((completedTaskCount / allTasks.length) * 100) : 0;
  const allShoppingItems = shoppingItems ?? [];
  const purchasedItemCount = allShoppingItems.filter((item) => item.purchase_status === "purchased").length;
  const shoppingPreview = sortShoppingItems(allShoppingItems.filter((item) => item.purchase_status !== "purchased")).slice(0, 2);

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
          <Link className="family-entry-link" href="/family">가족 설정 · 배우자 초대</Link>
        </div>
        <div className="week-orbit" aria-hidden="true">
          <span>{pregnancy.weeks}</span>
          <small>WEEK</small>
        </div>
      </section>

      <div className="dashboard__grid">
        <SectionCard
          title="이번 주 할 일"
          description={tasksError
            ? "목록을 잠시 불러오지 못했어요"
            : upcomingTasks.length
              ? "가까운 준비부터 최대 3개를 보여드려요"
              : "가족과 함께 첫 할 일을 만들어 보세요"}
          trailing={<Link className="text-link" href="/tasks">전체 보기</Link>}
          className="dashboard__tasks"
        >
          <ul className="task-list">
            {upcomingTasks.map((task) => (
              <li key={task.id}>
                <span className="home-task-status" aria-hidden="true" />
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.category} · {task.due_date ? formatTaskDate(task.due_date) : TASK_STATUS_LABELS[task.status]}</span>
                </div>
              </li>
            ))}
          </ul>
          {tasksError ? (
            <p className="dashboard-empty" role="alert">할 일을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.</p>
          ) : !upcomingTasks.length ? (
            <p className="dashboard-empty">이번 주 예정된 할 일이 없어요.</p>
          ) : null}
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

        <SectionCard title="출산 준비 진행률" description="등록된 할 일 완료 기준" className="dashboard__progress">
          <div className="progress-summary">
            <strong>{taskProgress}<span>%</span></strong>
            <p>{tasksError
              ? "진행률을 불러오지 못했어요"
              : allTasks.length
                ? <><b>{completedTaskCount}개</b> 완료 · 전체 {allTasks.length}개</>
                : "아직 등록된 할 일이 없어요"}</p>
          </div>
          <div className="progress-track" role="progressbar" aria-label="출산 준비 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={taskProgress}>
            <span style={{ width: `${taskProgress}%` }} />
          </div>
        </SectionCard>

        <div className="metric-grid">
          <Link href="/shopping" className="metric-card metric-card--peach">
            <span className="metric-card__icon" aria-hidden="true">⌂</span>
            <span>구매 준비</span>
            <strong>{shoppingError ? "-" : purchasedItemCount} <small>/ {shoppingError ? "-" : allShoppingItems.length}개</small></strong>
            <em>{shoppingError
              ? "준비물을 불러오지 못했어요"
              : shoppingPreview.length
                ? `다음: ${shoppingPreview.map((item) => item.item_name).join(", ")}`
                : allShoppingItems.length
                  ? "모두 준비했어요"
                  : "첫 준비물을 추가해 보세요"}</em>
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
