"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

import {
  createShoppingItem,
  deleteShoppingItem,
  updatePurchaseStatus,
  updateShoppingItem,
  type ShoppingMutationState,
} from "@/app/shopping/actions";
import {
  formatWon,
  getSafePurchaseUrl,
  PURCHASE_STATUSES,
  PURCHASE_STATUS_LABELS,
  SHOPPING_CATEGORIES,
  SHOPPING_PRIORITIES,
  SHOPPING_PRIORITY_LABELS,
} from "@/lib/shopping";
import type { PurchaseStatus, ShoppingItem, ShoppingPriority } from "@/types/database";

type StatusFilter = "all" | PurchaseStatus;
type PriorityFilter = "all" | ShoppingPriority;
const initialMutationState: ShoppingMutationState = { error: null, success: false };

export function ShoppingBoard({ items }: { items: ShoppingItem[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<{ message: string } | null>(null);

  const filteredItems = useMemo(() => items.filter((item) => (
    (statusFilter === "all" || item.purchase_status === statusFilter)
    && (categoryFilter === "all" || item.category === categoryFilter)
    && (priorityFilter === "all" || item.priority === priorityFilter)
  )), [items, statusFilter, categoryFilter, priorityFilter]);

  const purchasedItems = items.filter((item) => item.purchase_status === "purchased");
  const totalCost = items.reduce((sum, item) => sum + (item.price ?? 0), 0);
  const purchasedCost = purchasedItems.reduce((sum, item) => sum + (item.price ?? 0), 0);

  const handleCreated = useCallback(() => {
    setIsAdding(false);
    setFlashMessage({ message: "준비물을 추가했어요." });
  }, []);

  const handleUpdated = useCallback(() => {
    setEditingId(null);
    setFlashMessage({ message: "준비물을 저장했어요." });
  }, []);

  useEffect(() => {
    if (!flashMessage) return;

    const timeoutId = window.setTimeout(() => setFlashMessage(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [flashMessage]);

  return (
    <>
      <section className="shopping-summary" aria-label="준비물 요약">
        <SummaryItem label="전체 품목" value={`${items.length}개`} />
        <SummaryItem label="구매 완료" value={`${purchasedItems.length}개`} />
        <SummaryItem label="총 예상 비용" value={formatWon(totalCost)} />
        <SummaryItem label="구매 완료 금액" value={formatWon(purchasedCost)} />
      </section>

      <section className="shopping-toolbar" aria-label="준비물 필터와 추가">
        <div className="shopping-filter-chips">
          <FilterButton active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>전체</FilterButton>
          {PURCHASE_STATUSES.map((status) => (
            <FilterButton key={status} active={statusFilter === status} onClick={() => setStatusFilter(status)}>
              {PURCHASE_STATUS_LABELS[status]}
            </FilterButton>
          ))}
        </div>
        <div className="shopping-toolbar__actions">
          <label>
            <span className="sr-only">카테고리 필터</span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">모든 카테고리</option>
              {SHOPPING_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">우선순위 필터</span>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}>
              <option value="all">모든 우선순위</option>
              {SHOPPING_PRIORITIES.map((priority) => <option key={priority} value={priority}>{SHOPPING_PRIORITY_LABELS[priority]}</option>)}
            </select>
          </label>
          <button className="primary-button" type="button" onClick={() => setIsAdding((value) => !value)}>
            {isAdding ? "닫기" : "+ 준비물 추가"}
          </button>
        </div>
      </section>

      {flashMessage ? <p className="shopping-flash" role="status" aria-live="polite">{flashMessage.message}</p> : null}

      {isAdding ? <ShoppingEditor onCancel={() => setIsAdding(false)} onSaved={handleCreated} /> : null}

      {filteredItems.length ? (
        <ul className="shopping-board-list">
          {filteredItems.map((item) => (
            <li key={item.id} className={item.purchase_status === "purchased" ? "is-purchased" : undefined}>
              {editingId === item.id ? (
                <ShoppingEditor item={item} onCancel={() => setEditingId(null)} onSaved={handleUpdated} />
              ) : (
                <ShoppingCard item={item} onEdit={() => setEditingId(item.id)} />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="card shopping-empty">
          <strong>{items.length ? "조건에 맞는 준비물이 없어요." : "아직 등록된 준비물이 없어요."}</strong>
          <p>{items.length ? "필터를 바꿔 다른 준비물을 확인해 보세요." : "첫 번째 준비물을 가족과 함께 추가해 보세요."}</p>
        </div>
      )}
    </>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" data-active={active} onClick={onClick}>{children}</button>;
}

function ShoppingCard({ item, onEdit }: { item: ShoppingItem; onEdit: () => void }) {
  const [statusState, statusAction, isStatusPending] = useActionState(updatePurchaseStatus, initialMutationState);
  const [deleteState, deleteAction, isDeletePending] = useActionState(deleteShoppingItem, initialMutationState);
  const purchaseUrl = getSafePurchaseUrl(item.purchase_url);

  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("이 준비물을 삭제할까요?")) event.preventDefault();
  }

  return (
    <article className="shopping-card">
      <div className="shopping-card__topline">
        <div>
          <span className="shopping-category">{item.category}</span>
          <h2>{item.item_name}</h2>
        </div>
        <form action={statusAction}>
          <input type="hidden" name="itemId" value={item.id} />
          <select
            name="purchaseStatus"
            defaultValue={item.purchase_status}
            aria-label={`${item.item_name} 구매 상태`}
            disabled={isStatusPending}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          >
            {PURCHASE_STATUSES.map((status) => <option key={status} value={status}>{PURCHASE_STATUS_LABELS[status]}</option>)}
          </select>
        </form>
      </div>
      <div className="shopping-card__meta">
        <span data-priority={item.priority}>{SHOPPING_PRIORITY_LABELS[item.priority]}</span>
        <span>{item.price === null ? "가격 미정" : formatWon(item.price)}</span>
      </div>
      {item.memo ? <p className="shopping-card__memo">{item.memo}</p> : null}
      {purchaseUrl ? (
        <a className="shopping-link" href={purchaseUrl} target="_blank" rel="noopener noreferrer">상품 보기 ↗</a>
      ) : null}
      {statusState.error ? <p className="form-message" role="alert">{statusState.error}</p> : null}
      {deleteState.error ? <p className="form-message" role="alert">{deleteState.error}</p> : null}
      <div className="shopping-card__actions">
        <button type="button" onClick={onEdit}>수정</button>
        <form action={deleteAction} onSubmit={confirmDelete}>
          <input type="hidden" name="itemId" value={item.id} />
          <button type="submit" disabled={isDeletePending}>{isDeletePending ? "삭제 중…" : "삭제"}</button>
        </form>
      </div>
    </article>
  );
}

function ShoppingEditor({ item, onCancel, onSaved }: { item?: ShoppingItem; onCancel: () => void; onSaved: () => void }) {
  const action = item ? updateShoppingItem : createShoppingItem;
  const [state, formAction, isPending] = useActionState(action, initialMutationState);
  const handledSuccess = useRef(false);

  useEffect(() => {
    if (!state.success || handledSuccess.current) return;

    handledSuccess.current = true;
    onSaved();
  }, [state.success, onSaved]);

  return (
    <form className="shopping-editor card" action={formAction}>
      {item ? <input type="hidden" name="itemId" value={item.id} /> : null}
      <header className="shopping-editor__heading shopping-editor__wide">
        <span className="eyebrow">{item ? "준비물 다듬기" : "새로운 준비"}</span>
        <h2>{item ? "준비물 수정" : "준비물 추가"}</h2>
      </header>
      <label className="shopping-editor__wide">품목명<input name="itemName" type="text" defaultValue={item?.item_name} maxLength={120} placeholder="예: 아기침대" required /></label>
      <label>카테고리<select name="category" defaultValue={item?.category ?? "기타"}>{SHOPPING_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label>우선순위<select name="priority" defaultValue={item?.priority ?? "medium"}>{SHOPPING_PRIORITIES.map((priority) => <option key={priority} value={priority}>{SHOPPING_PRIORITY_LABELS[priority]}</option>)}</select></label>
      <label>구매 상태<select name="purchaseStatus" defaultValue={item?.purchase_status ?? "planned"}>{PURCHASE_STATUSES.map((status) => <option key={status} value={status}>{PURCHASE_STATUS_LABELS[status]}</option>)}</select></label>
      <label>가격<input name="price" type="number" inputMode="numeric" min={0} max={999999999999} step={1} defaultValue={item?.price ?? ""} placeholder="원 단위" /></label>
      <label className="shopping-editor__wide">구매 링크<input name="purchaseUrl" type="text" inputMode="url" defaultValue={item?.purchase_url ?? ""} maxLength={2000} placeholder="예: samsung.com 또는 https://samsung.com" /></label>
      <label className="shopping-editor__wide">메모<textarea name="memo" defaultValue={item?.memo ?? ""} maxLength={2000} rows={3} placeholder="비교한 내용이나 가족과 공유할 메모를 적어 주세요." /></label>
      {state.error ? <p className="form-message shopping-editor__wide" role="alert">{state.error}</p> : null}
      <div className="shopping-editor__buttons shopping-editor__wide">
        <button type="button" onClick={onCancel}>취소</button>
        <button className="primary-button" type="submit" disabled={isPending}>{isPending ? "저장 중…" : "저장"}</button>
      </div>
    </form>
  );
}
