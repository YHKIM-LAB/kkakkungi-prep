"use client";

import { useActionState, useState, useSyncExternalStore } from "react";

import { createInvitation, type InvitationState } from "@/app/family/actions";

const initialState: InvitationState = { error: null, invitation: null };
const subscribeToOrigin = () => () => {};

export function InviteForm() {
  const [state, formAction, isPending] = useActionState(createInvitation, initialState);
  const origin = useSyncExternalStore(subscribeToOrigin, () => window.location.origin, () => "");
  const [copied, setCopied] = useState(false);

  const inviteLink = state.invitation && origin
    ? `${origin}/invite?token=${encodeURIComponent(state.invitation.token)}`
    : "";

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="invite-form-wrap">
      <form className="invite-form" action={formAction}>
        <label htmlFor="spouse-email">배우자 이메일</label>
        <div className="invite-form__row">
          <input id="spouse-email" name="email" type="email" autoComplete="email" placeholder="partner@example.com" required />
          <button className="primary-button" type="submit" disabled={isPending}>
            {isPending ? "만드는 중…" : "배우자 초대하기"}
          </button>
        </div>
        <p className="setup-form__hint">초대 링크는 7일 동안 유효해요.</p>
        {state.error ? <p className="form-message" role="alert">{state.error}</p> : null}
      </form>

      {state.invitation ? (
        <div className="invitation-result" aria-live="polite">
          <div>
            <span>초대 대상</span>
            <strong>{state.invitation.email}</strong>
          </div>
          <div>
            <span>만료일</span>
            <strong>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(state.invitation.expiresAt))}</strong>
          </div>
          <label htmlFor="invite-link">초대 링크</label>
          <div className="invite-link-row">
            <input id="invite-link" value={inviteLink || "링크를 준비하고 있어요…"} readOnly />
            <button type="button" onClick={copyLink} disabled={!inviteLink}>{copied ? "복사됨" : "초대 링크 복사"}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
