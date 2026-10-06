"use client";

import { useActionState, useState } from "react";

import { updateOwnDisplayName, type DisplayNameState } from "@/app/family/actions";
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/display-name";

const initialState: DisplayNameState = { error: null };

export function DisplayNameEditor({ currentName }: { currentName: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(updateOwnDisplayName, initialState);

  if (!isEditing) {
    return (
      <div className="member-name-view">
        <div><strong>{currentName}</strong><span>나</span></div>
        <button type="button" onClick={() => setIsEditing(true)}>이름 수정</button>
      </div>
    );
  }

  return (
    <form className="member-name-form" action={formAction}>
      <label htmlFor="family-display-name">내 이름</label>
      <div>
        <input
          id="family-display-name"
          name="displayName"
          type="text"
          defaultValue={currentName}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          autoComplete="name"
          required
        />
        <button type="submit" disabled={isPending}>{isPending ? "저장 중…" : "저장"}</button>
        <button type="button" onClick={() => setIsEditing(false)} disabled={isPending}>취소</button>
      </div>
      {state.error ? <p className="form-message" role="alert">{state.error}</p> : null}
    </form>
  );
}
