import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";

const expenseRows = [
  { label: "산부인과 진료", category: "의료", amount: "180,000원", paid: true },
  { label: "영양제", category: "건강", amount: "120,000원", paid: true },
  { label: "태아보험", category: "보험", amount: "380,000원", paid: true },
];

export default function ExpensesPage() {
  return (
    <div className="subpage">
      <PageHeading eyebrow="미리 알고 편안하게" title="비용" description="예상 비용과 실제 지출을 함께 보며 준비해요." />
      <section className="expense-summary" aria-label="비용 요약">
        <div className="expense-summary__main">
          <span>총 예상비용</span><strong>4,820,000원</strong>
          <div className="progress-track progress-track--light" role="progressbar" aria-label="예상 비용 대비 지출" aria-valuemin={0} aria-valuemax={100} aria-valuenow={14}>
            <span style={{ width: "14%" }} />
          </div>
        </div>
        <div><span>현재까지 지출</span><strong>680,000원</strong></div>
        <div><span>남은 예상비용</span><strong>4,140,000원</strong></div>
      </section>
      <SectionCard title="최근 지출" description="지금까지 기록한 비용이에요">
        <ul className="expense-list">
          {expenseRows.map((expense) => (
            <li key={expense.label}>
              <span className="expense-dot" aria-hidden="true" />
              <div><strong>{expense.label}</strong><span>{expense.category} · 결제 완료</span></div>
              <strong>{expense.amount}</strong>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
