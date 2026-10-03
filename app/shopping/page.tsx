import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";

const items = [
  { name: "아기침대", category: "수면", status: "비교 중", priority: "꼭 필요" },
  { name: "카시트", category: "외출", status: "알아보기", priority: "꼭 필요" },
  { name: "유모차", category: "외출", status: "알아보기", priority: "보통" },
  { name: "젖병", category: "수유", status: "구매 완료", priority: "꼭 필요" },
  { name: "속싸개", category: "의류", status: "담아두기", priority: "보통" },
];

export default function ShoppingPage() {
  return (
    <div className="subpage">
      <PageHeading eyebrow="필요한 만큼만" title="준비물" description="비교하고 결정한 내용을 한곳에 차곡차곡 모아요." />
      <div className="mini-summary">
        <div><span>전체</span><strong>64</strong></div>
        <div><span>준비 중</span><strong>12</strong></div>
        <div><span>구매 완료</span><strong>8</strong></div>
      </div>
      <SectionCard title="준비 목록" description="우선순위가 높은 항목부터 보여드려요">
        <ul className="shopping-list">
          {items.map((item) => (
            <li key={item.name}>
              <span className="item-initial" aria-hidden="true">{item.name.slice(0, 1)}</span>
              <div><strong>{item.name}</strong><span>{item.category} · {item.priority}</span></div>
              <span className={item.status === "구매 완료" ? "status-pill status-pill--done" : "status-pill"}>{item.status}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
