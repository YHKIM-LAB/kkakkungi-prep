"use client";

import { useActionState } from "react";

import { createHousehold, type SetupState } from "@/app/setup/actions";

const initialState: SetupState = { error: null };

export function SetupForm({ defaultDisplayName }: { defaultDisplayName: string }) {
  const [state, action, isPending] = useActionState(createHousehold, initialState);

  return (
    <form className="setup-form" action={action}>
      <label>
        가족 공간 이름
        <input name="householdName" type="text" defaultValue="우리 가족" maxLength={40} required />
      </label>
      <label>
        내 이름
        <input name="displayName" type="text" defaultValue={defaultDisplayName} maxLength={30} required />
      </label>
      <label>
        아기 태명
        <input name="babyNickname" type="text" placeholder="예: 까꿍이" maxLength={30} required />
      </label>
      <label>
        출산 예정일
        <input name="dueDate" type="date" required />
      </label>
      <p className="setup-form__hint">출산 예정일을 기준으로 현재 임신 주차와 D-day를 자동 계산해요.</p>
      {state.error ? <p className="form-message" role="alert">{state.error}</p> : null}
      <button className="primary-button" type="submit" disabled={isPending}>
        {isPending ? "가족 공간 만드는 중…" : "준비실 시작하기"}
      </button>
    </form>
  );
}
