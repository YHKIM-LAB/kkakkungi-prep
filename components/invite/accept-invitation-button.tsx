"use client";

import { useActionState } from "react";

import { acceptInvitation, type AcceptInvitationState } from "@/app/invite/actions";

const initialState: AcceptInvitationState = { error: null };

export function AcceptInvitationButton({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(acceptInvitation, initialState);

  return (
    <form className="accept-invitation-form" action={formAction}>
      <input type="hidden" name="token" value={token} />
      {state.error ? <p className="form-message" role="alert">{state.error}</p> : null}
      <button className="primary-button" type="submit" disabled={isPending}>
        {isPending ? "참여하는 중…" : "같은 준비실에 참여하기"}
      </button>
    </form>
  );
}
