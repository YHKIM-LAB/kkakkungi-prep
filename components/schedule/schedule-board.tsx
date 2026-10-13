"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { createSchedule, updateSchedule, deleteSchedule, type ScheduleActionState } from "@/app/schedule/actions";
import type { Schedule } from "@/types/database";
const empty: ScheduleActionState = { error: null, success: false };
const kinds = ["진료", "검사", "예약", "준비", "기타"];

function Editor({ item, done, cancel }: { item?: Schedule; done: () => void; cancel: () => void }) {
  const [state, action, pending] = useActionState(item ? updateSchedule : createSchedule, empty);
  useEffect(() => { if (state.success) done(); }, [state.success, done]);
  return (
    <form className="card schedule-form" action={action}>
      {item && <input name="id" type="hidden" value={item.id} />}
      <label>일정 제목<input name="title" required maxLength={120} defaultValue={item?.title} placeholder="예: 산부인과 정기 진료" /></label>
      <label>날짜<input name="date" type="date" required defaultValue={item?.date} /></label>
      <label>분류<select name="category" defaultValue={item?.category ?? "진료"}>{kinds.map(k => <option key={k} value={k}>{k}</option>)}</select></label>
      <label>병원·장소 / 예약 상태 / 메모<textarea name="memo" maxLength={2000} rows={3} defaultValue={item?.memo ?? ""} placeholder={"예: 시온여성병원\n예약 완료 · 오전 10:30"} /></label>
      {state.error && <p className="form-message" role="alert">{state.error}</p>}
      <div className="schedule-form__buttons"><button type="button" onClick={cancel}>취소</button><button className="primary-button" disabled={pending}>{pending ? "저장 중…" : "저장"}</button></div>
    </form>
  );
}
function Entry({ item }: { item: Schedule }) {
  const [editing, setEditing] = useState(false);
  const [state, remove, pending] = useActionState(deleteSchedule, empty);
  const date = new Date(item.date + "T00:00:00+09:00");
  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("이 일정을 삭제할까요?")) event.preventDefault();
  }
  if (editing) return <li><Editor item={item} cancel={() => setEditing(false)} done={() => setEditing(false)} /></li>;
  return <li className="schedule-entry">
    <div className="timeline__week">{item.pregnancy_week === null ? "일정" : item.pregnancy_week + "주"}</div>
    <div className="timeline__marker" aria-hidden="true"><span /></div>
    <div className="timeline__content">
      <time dateTime={item.date}>{new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Seoul" }).format(date)}</time>
      <strong>{item.title}</strong> <span className="schedule-category">{item.category}</span>
      {item.memo && <p className="schedule-memo">{item.memo}</p>}
      {state.error && <p className="form-message" role="alert">{state.error}</p>}
      <div className="schedule-item-actions">
        <button type="button" onClick={() => setEditing(true)}>수정</button>
        <form action={remove} onSubmit={confirmDelete}><input name="id" type="hidden" value={item.id} /><button type="submit" disabled={pending}>삭제</button></form>
      </div>
    </div>
  </li>;
}
export function ScheduleBoard({ items }: { items: Schedule[] }) {
  const [adding, setAdding] = useState(false);
  return <div className="schedule-board">
    <button type="button" className="primary-button schedule-add" onClick={() => setAdding(x => !x)}>{adding ? "추가 닫기" : "+ 일정 추가"}</button>
    {adding && <Editor cancel={() => setAdding(false)} done={() => setAdding(false)} />}
    {items.length ? <ol className="timeline">{items.map(item => <Entry key={item.id} item={item} />)}</ol> : <div className="card schedule-empty">등록된 일정이 없어요. 첫 진료나 검사 일정을 추가해 보세요.</div>}
  </div>;
}
