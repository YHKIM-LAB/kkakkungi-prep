import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";

const tasks = [
  { title: "태아보험 비교표 만들기", meta: "보험 · 이번 주", status: "시작 전", done: false },
  { title: "출산병원 후보 정리", meta: "병원 · 7주차", status: "완료", done: true },
  { title: "임신확인서 발급 확인", meta: "행정 · 8주차", status: "진행 중", done: false },
  { title: "보건소 혜택 알아보기", meta: "행정 · 9주차", status: "시작 전", done: false },
];

export default function TasksPage() {
  return (
    <div className="subpage">
      <PageHeading eyebrow="함께 하나씩" title="할 일" description="이번 주에 필요한 준비부터 부담 없이 나눠 해요." />
      <SectionCard title="이번 주 목록" description="4개 중 1개를 완료했어요" trailing={<span className="count-badge">1 / 4</span>}>
        <ul className="detail-list">
          {tasks.map((task) => (
            <li key={task.title}>
              <input type="checkbox" defaultChecked={task.done} aria-label={`${task.title} 완료 여부`} />
              <div className={task.done ? "is-done" : undefined}>
                <strong>{task.title}</strong>
                <span>{task.meta}</span>
              </div>
              <span className={`status-pill status-pill--${task.done ? "done" : "todo"}`}>{task.status}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
