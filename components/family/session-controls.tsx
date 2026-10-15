"use client";

import { useActionState } from "react";

import { endSession, type SessionActionState } from "@/app/family/session-actions";

const initialState: SessionActionState = { error: null };

export function SessionControls({ email }: { email: string | undefined }) {
  const [state, action, pending] = useActionState(endSession, initialState);

  return (
    <form className="session-controls" action={action} aria-busy={pending}>
      <div className="session-controls__identity">
        <span>로그인한 계정</span>
        <strong>{email ?? "현재 계정"}</strong>
      </div>
      <p>이 기기에서 로그아웃해요. 가족 공간과 기록은 그대로 보관돼요.</p>
      <div className="session-controls__buttons">
        <button className="secondary-button" type="submit" name="intent" value="switch" disabled={pending}>다른 계정으로 로그인</button>
        <button className="secondary-button" type="submit" name="intent" value="logout" disabled={pending}>로그아웃</button>
      </div>
      {pending ? <p role="status">로그아웃하는 중…</p> : null}
      {state.error ? <p className="form-message" role="alert">{state.error}</p> : null}
    </form>
  );
}
