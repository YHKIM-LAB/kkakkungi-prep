"use client";

import { useActionState } from "react";

import { acceptInvitation, type AcceptInvitationState } from "@/app/invite/actions";
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/display-name";

const initialState: AcceptInvitationState = { error: null };

export function AcceptInvitationButton({ token, defaultDisplayName }: { token: string; defaultDisplayName: string }) {
  const [state, formAction, isPending] = useActionState(acceptInvitation, initialState);

  return (
    <form className="accept-invitation-form" action={formAction}>
      <input type="hidden" name="token" value={token} />
      <label htmlFor="invite-display-name">이 준비실에서 사용할 이름</label>
      <input
        id="invite-display-name"
        name="displayName"
        type="text"
        defaultValue={defaultDisplayName}
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        placeholder="예: 김영혁"
        autoComplete="name"
        required
      />
      {state.error ? <p className="form-message" role="alert">{state.error}</p> : null}
      <button className="primary-button" type="submit" disabled={isPending}>
        {isPending ? "참여하는 중…" : "같은 준비실에 참여하기"}
      </button>
    </form>
  );
}
