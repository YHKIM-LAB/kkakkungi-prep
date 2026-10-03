import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";

const schedules = [
  { week: "8주", date: "10월 8일", title: "산부인과 정기 진료", note: "오전 10:30 · 햇살여성병원", active: true },
  { week: "10주", date: "10월 22일", title: "NIPT 검사 여부 결정", note: "검사 항목과 비용 함께 검토", active: false },
  { week: "12주", date: "11월 5일", title: "1차 기형아 검사", note: "예약 시간 다시 확인하기", active: false },
  { week: "16주", date: "12월 3일", title: "2차 정기 진료", note: "일정 확정 전", active: false },
];

export default function SchedulePage() {
  return (
    <div className="subpage">
      <PageHeading eyebrow="다가오는 순간들" title="일정" description="진료와 검사를 임신 주차 흐름에 맞춰 확인해요." />
      <SectionCard title="임신 일정 타임라인" description="다음 진료까지 5일 남았어요">
        <ol className="timeline">
          {schedules.map((schedule) => (
            <li key={schedule.title} className={schedule.active ? "is-active" : undefined}>
              <div className="timeline__week">{schedule.week}</div>
              <div className="timeline__marker" aria-hidden="true"><span /></div>
              <div className="timeline__content">
                <time>{schedule.date}</time>
                <strong>{schedule.title}</strong>
                <p>{schedule.note}</p>
              </div>
            </li>
          ))}
        </ol>
      </SectionCard>
    </div>
  );
}
