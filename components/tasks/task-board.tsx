"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

import { createTask, deleteTask, updateTask, updateTaskStatus, type TaskMutationState } from "@/app/tasks/actions";
import { getPregnancyWeekForDate } from "@/lib/pregnancy";
import { formatTaskDate, TASK_CATEGORIES, TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/tasks";
import type { Task, TaskStatus } from "@/types/database";

type StatusFilter = "all" | TaskStatus;
const initialMutationState: TaskMutationState = { error: null, success: false };

export function TaskBoard({ tasks, profileDueDate }: { tasks: Task[]; profileDueDate: string | null }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<{ message: string } | null>(null);
  const filteredTasks = useMemo(() => tasks.filter((task) => (
    (statusFilter === "all" || task.status === statusFilter)
    && (categoryFilter === "all" || task.category === categoryFilter)
  )), [tasks, statusFilter, categoryFilter]);
  const doneCount = tasks.filter((task) => task.status === "done").length;
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  const handleCreated = useCallback(() => {
    setIsAdding(false);
    setFlashMessage({ message: "할 일을 추가했어요." });
  }, []);

  const handleUpdated = useCallback(() => {
    setEditingId(null);
    setFlashMessage({ message: "할 일을 저장했어요." });
  }, []);

  useEffect(() => {
    if (!flashMessage) return;

    const timeoutId = window.setTimeout(() => setFlashMessage(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [flashMessage]);

  return (
    <>
      <section className="task-summary" aria-label="할 일 요약">
        <div><span>전체</span><strong>{tasks.length}</strong></div>
        <div><span>완료</span><strong>{doneCount}</strong></div>
        <div><span>진행률</span><strong>{progress}%</strong></div>
      </section>

      <section className="task-toolbar" aria-label="할 일 필터와 추가">
        <div className="task-filter-chips">
          <FilterButton active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>전체</FilterButton>
          {TASK_STATUSES.map((status) => (
            <FilterButton key={status} active={statusFilter === status} onClick={() => setStatusFilter(status)}>
              {TASK_STATUS_LABELS[status]}
            </FilterButton>
          ))}
        </div>
        <div className="task-toolbar__actions">
          <label>
            <span className="sr-only">카테고리 필터</span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">모든 카테고리</option>
              {TASK_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <button className="primary-button" type="button" onClick={() => setIsAdding((value) => !value)}>
            {isAdding ? "닫기" : "+ 할 일 추가"}
          </button>
        </div>
      </section>

      {flashMessage ? <p className="task-flash" role="status" aria-live="polite">{flashMessage.message}</p> : null}

      {isAdding ? (
        <TaskEditor profileDueDate={profileDueDate} onCancel={() => setIsAdding(false)} onSaved={handleCreated} />
      ) : null}

      {filteredTasks.length ? (
        <ul className="task-board-list">
          {filteredTasks.map((task) => (
            <li key={task.id} className={task.status === "done" ? "is-done" : undefined}>
              {editingId === task.id ? (
                <TaskEditor task={task} profileDueDate={profileDueDate} onCancel={() => setEditingId(null)} onSaved={handleUpdated} />
              ) : (
                <TaskCard task={task} onEdit={() => setEditingId(task.id)} />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="card task-empty">
          <strong>{tasks.length ? "조건에 맞는 할 일이 없어요." : "아직 등록된 할 일이 없어요."}</strong>
          <p>{tasks.length ? "필터를 바꿔 다른 할 일을 확인해 보세요." : "첫 번째 준비 항목을 가족과 함께 추가해 보세요."}</p>
        </div>
      )}
    </>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" data-active={active} onClick={onClick}>{children}</button>;
}

function TaskCard({ task, onEdit }: { task: Task; onEdit: () => void }) {
  const [statusState, statusAction, isStatusPending] = useActionState(updateTaskStatus, initialMutationState);
  const [deleteState, deleteAction, isDeletePending] = useActionState(deleteTask, initialMutationState);

  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("이 할 일을 삭제할까요?")) event.preventDefault();
  }

  return (
    <article className="task-card">
      <div className="task-card__topline">
        <div><span className="task-category">{task.category}</span><h2>{task.title}</h2></div>
        <form action={statusAction}>
          <input type="hidden" name="taskId" value={task.id} />
          <select name="status" defaultValue={task.status} aria-label={`${task.title} 상태`} disabled={isStatusPending} onChange={(event) => event.currentTarget.form?.requestSubmit()}>
            {TASK_STATUSES.map((status) => <option key={status} value={status}>{TASK_STATUS_LABELS[status]}</option>)}
          </select>
        </form>
      </div>
      <div className="task-card__meta">
        {task.due_date ? <span>마감 {formatTaskDate(task.due_date)}</span> : <span>날짜 미정</span>}
        {task.pregnancy_week !== null ? <span>임신 {task.pregnancy_week}주</span> : null}
      </div>
      {task.memo ? <p className="task-card__memo">{task.memo}</p> : null}
      {statusState.error ? <p className="form-message" role="alert">{statusState.error}</p> : null}
      {deleteState.error ? <p className="form-message" role="alert">{deleteState.error}</p> : null}
      <div className="task-card__actions">
        <button type="button" onClick={onEdit}>수정</button>
        <form action={deleteAction} onSubmit={confirmDelete}>
          <input type="hidden" name="taskId" value={task.id} />
          <button type="submit" disabled={isDeletePending}>{isDeletePending ? "삭제 중…" : "삭제"}</button>
        </form>
      </div>
    </article>
  );
}

function TaskEditor({
  task,
  profileDueDate,
  onCancel,
  onSaved,
}: {
  task?: Task;
  profileDueDate: string | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const action = task ? updateTask : createTask;
  const [state, formAction, isPending] = useActionState(action, initialMutationState);
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [pregnancyWeek, setPregnancyWeek] = useState(task?.pregnancy_week?.toString() ?? "");
  const handledSuccess = useRef(false);

  useEffect(() => {
    if (!state.success || handledSuccess.current) return;

    handledSuccess.current = true;
    onSaved();
  }, [state.success, onSaved]);

  function handleDueDateChange(value: string) {
    setDueDate(value);
    if (!value || !profileDueDate) return;
    try {
      setPregnancyWeek(String(getPregnancyWeekForDate(profileDueDate, value)));
    } catch {
      setPregnancyWeek("");
    }
  }

  return (
    <form className="task-editor card" action={formAction}>
      {task ? <input type="hidden" name="taskId" value={task.id} /> : null}
      <header className="task-editor__heading task-editor__wide">
        <span className="eyebrow">{task ? "할 일 다듬기" : "새로운 준비"}</span>
        <h2>{task ? "할 일 수정" : "할 일 추가"}</h2>
      </header>
      <label className="task-editor__wide">제목<input name="title" type="text" defaultValue={task?.title} maxLength={120} placeholder="예: 산부인과 예약하기" required /></label>
      <label>카테고리<select name="category" defaultValue={task?.category ?? "기타"}>{TASK_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
      {task ? <label>상태<select name="status" defaultValue={task.status}>{TASK_STATUSES.map((status) => <option key={status} value={status}>{TASK_STATUS_LABELS[status]}</option>)}</select></label> : null}
      <label>마감일<input name="dueDate" type="date" value={dueDate} onChange={(event) => handleDueDateChange(event.target.value)} /></label>
      <label>임신 주차<input name="pregnancyWeek" type="number" min={0} max={45} value={pregnancyWeek} onChange={(event) => setPregnancyWeek(event.target.value)} placeholder="자동 계산" /></label>
      <label className="task-editor__wide">메모<textarea name="memo" defaultValue={task?.memo ?? ""} maxLength={2000} rows={3} placeholder="가족과 공유할 내용을 적어 주세요." /></label>
      {state.error ? <p className="form-message task-editor__wide" role="alert">{state.error}</p> : null}
      <div className="task-editor__buttons task-editor__wide">
        <button type="button" onClick={onCancel}>취소</button>
        <button className="primary-button" type="submit" disabled={isPending}>{isPending ? "저장 중…" : "저장"}</button>
      </div>
    </form>
  );
}
