"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";

import {
  createExpense,
  deleteExpense,
  toggleExpensePaid,
  updateExpense,
  type ExpenseActionState,
} from "@/app/expenses/actions";
import { EXPENSE_CATEGORIES, getExpenseSummary } from "@/lib/expenses";
import { formatWon } from "@/lib/shopping";
import type { Expense } from "@/types/database";

const emptyState: ExpenseActionState = { error: null, success: false };

function ExpenseEditor({ item, onDone, onCancel }: { item?: Expense; onDone: () => void; onCancel: () => void }) {
  const [state, action, pending] = useActionState(item ? updateExpense : createExpense, emptyState);

  useEffect(() => {
    if (state.success) onDone();
  }, [onDone, state.success]);

  return (
    <form className="card expense-form" action={action}>
      {item ? <input name="id" type="hidden" value={item.id} /> : null}
      <div className="expense-form__grid">
        <label className="expense-form__wide">
          비용 이름
          <input name="title" required maxLength={120} defaultValue={item?.title} placeholder="예: 산부인과 정기 진료" />
        </label>
        <label>
          분류
          <select name="category" defaultValue={item?.category ?? "의료"}>
            {EXPENSE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label>
          금액
          <span className="expense-form__amount"><input name="amount" type="number" min={0} max={999999999999} step={1} inputMode="numeric" required defaultValue={item?.amount} placeholder="0" /><span>원</span></span>
        </label>
        <label>
          결제일 (선택)
          <input name="paymentDate" type="date" defaultValue={item?.payment_date ?? ""} />
        </label>
        <label className="expense-form__paid">
          <input name="paid" type="checkbox" defaultChecked={item?.paid ?? false} />
          결제 완료
        </label>
        <label className="expense-form__wide">
          메모 (선택)
          <textarea name="memo" maxLength={2000} rows={3} defaultValue={item?.memo ?? ""} placeholder="병원, 결제 수단 등 필요한 내용을 남겨 보세요." />
        </label>
      </div>
      {state.error ? <p className="form-message" role="alert">{state.error}</p> : null}
      <div className="expense-form__buttons">
        <button type="button" onClick={onCancel}>취소</button>
        <button className="primary-button" disabled={pending}>{pending ? "저장 중…" : "저장"}</button>
      </div>
    </form>
  );
}

function ExpenseEntry({ item }: { item: Expense }) {
  const [editing, setEditing] = useState(false);
  const [toggleState, toggleAction, toggling] = useActionState(toggleExpensePaid, emptyState);
  const [deleteState, deleteAction, deleting] = useActionState(deleteExpense, emptyState);

  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(`“${item.title}” 비용을 삭제할까요?`)) event.preventDefault();
  }

  if (editing) {
    return (
      <li className="expense-editing">
        <ExpenseEditor item={item} onCancel={() => setEditing(false)} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className={item.paid ? "is-paid" : undefined}>
      <span className="expense-dot" aria-hidden="true" />
      <div className="expense-entry__details">
        <strong>{item.title}</strong>
        <span>{item.category} · {item.paid ? "결제 완료" : "결제 예정"}{item.payment_date ? ` · ${item.payment_date.replaceAll("-", ".")}` : ""}</span>
        {item.memo ? <p>{item.memo}</p> : null}
        {toggleState.error ? <p className="form-message" role="alert">{toggleState.error}</p> : null}
        {deleteState.error ? <p className="form-message" role="alert">{deleteState.error}</p> : null}
        <div className="expense-entry__actions">
          <form action={toggleAction}>
            <input name="id" type="hidden" value={item.id} />
            <input name="paid" type="hidden" value={String(!item.paid)} />
            <button type="submit" disabled={toggling}>{item.paid ? "미결제로 변경" : "결제 완료"}</button>
          </form>
          <button type="button" onClick={() => setEditing(true)}>수정</button>
          <form action={deleteAction} onSubmit={confirmDelete}>
            <input name="id" type="hidden" value={item.id} />
            <button type="submit" disabled={deleting}>삭제</button>
          </form>
        </div>
      </div>
      <strong className="expense-entry__amount">{formatWon(item.amount)}</strong>
    </li>
  );
}

export function ExpenseBoard({ items }: { items: Expense[] }) {
  const [adding, setAdding] = useState(false);
  const summary = getExpenseSummary(items);

  return (
    <div className="expense-board">
      <section className="expense-summary" aria-label="비용 요약">
        <div className="expense-summary__main">
          <span>총 예상비용</span>
          <strong>{formatWon(summary.total)}</strong>
          <div className="progress-track progress-track--light" role="progressbar" aria-label="예상 비용 대비 지출" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.progress}>
            <span style={{ width: `${summary.progress}%` }} />
          </div>
        </div>
        <div><span>현재까지 지출</span><strong>{formatWon(summary.paid)}</strong></div>
        <div><span>남은 예상비용</span><strong>{formatWon(summary.remaining)}</strong></div>
      </section>

      <button type="button" className="primary-button expense-add" onClick={() => setAdding((current) => !current)}>
        {adding ? "추가 닫기" : "+ 비용 추가"}
      </button>
      {adding ? <ExpenseEditor onCancel={() => setAdding(false)} onDone={() => setAdding(false)} /> : null}

      <section className="card expense-card" aria-labelledby="expense-list-title">
        <div className="card__header">
          <div><h2 id="expense-list-title">비용 목록</h2><p>예정 비용과 결제 내역을 함께 관리해요</p></div>
        </div>
        {items.length ? (
          <ul className="expense-list">{items.map((item) => <ExpenseEntry key={item.id} item={item} />)}</ul>
        ) : (
          <p className="expense-empty">등록된 비용이 없어요. 예상되는 첫 비용을 추가해 보세요.</p>
        )}
      </section>
    </div>
  );
}
