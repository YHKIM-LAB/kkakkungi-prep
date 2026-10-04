import type { Metadata } from "next";
import Link from "next/link";

import { AcceptInvitationButton } from "@/components/invite/accept-invitation-button";
import { SwitchAccountButton } from "@/components/invite/switch-account-button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "가족 초대" };

type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

const statusMessage: Record<Exclude<InviteStatus, "pending">, string> = {
  accepted: "이미 사용된 초대 링크예요.",
  expired: "초대 링크의 유효기간이 지났어요. owner에게 새 링크를 요청해 주세요.",
  revoked: "더 이상 사용할 수 없는 초대 링크예요. owner에게 새 링크를 요청해 주세요.",
};

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const supabase = await createClient();
  const [{ data: { user } }, invitationResult] = await Promise.all([
    supabase.auth.getUser(),
    token ? supabase.rpc("get_household_invitation", { p_token: token }) : Promise.resolve({ data: null, error: null }),
  ]);
  const invitation = invitationResult.data?.[0];

  if (!token || invitationResult.error || !invitation) {
    return <InviteMessage title="초대 링크를 확인해 주세요" description="유효한 초대 정보를 찾지 못했어요. 링크 전체를 다시 열어 주세요." />;
  }

  const status = invitation.status as InviteStatus;
  if (status !== "pending") {
    return <InviteMessage title="이 초대는 사용할 수 없어요" description={statusMessage[status] ?? "유효하지 않은 초대 링크예요."} />;
  }

  const next = `/invite?token=${encodeURIComponent(token)}`;
  const emailMatches = user?.email?.toLowerCase() === invitation.email.toLowerCase();

  return (
    <section className="invite-page">
      <div className="invite-card">
        <span className="invite-card__icon" aria-hidden="true">♥</span>
        <p className="eyebrow">{invitation.household_name}</p>
        <h1>같은 준비실에서<br />함께 준비해요.</h1>
        <p className="invite-card__lead">초대를 수락하면 가족과 같은 임신 정보와 준비 기록을 볼 수 있어요.</p>
        <dl className="invite-details">
          <div><dt>초대받은 이메일</dt><dd>{invitation.email}</dd></div>
          <div><dt>유효기간</dt><dd>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "long" }).format(new Date(invitation.expires_at))}까지</dd></div>
        </dl>

        {!user ? (
          <div className="invite-actions">
            <p>초대받은 이메일로 로그인하거나 새 계정을 만들어 주세요.</p>
            <Link className="primary-button" href={`/login?next=${encodeURIComponent(next)}`}>로그인 또는 회원가입</Link>
          </div>
        ) : emailMatches ? (
          <AcceptInvitationButton token={token} />
        ) : (
          <div className="invite-mismatch" role="alert">
            <strong>로그인한 계정이 달라요.</strong>
            <p>이 초대장은 <b>{invitation.email}</b> 계정용입니다. 해당 이메일로 다시 로그인해 주세요.</p>
            <SwitchAccountButton returnTo={next} />
          </div>
        )}
      </div>
    </section>
  );
}

function InviteMessage({ title, description }: { title: string; description: string }) {
  return (
    <section className="invite-page">
      <div className="invite-card invite-card--message">
        <span className="invite-card__icon" aria-hidden="true">!</span>
        <h1>{title}</h1>
        <p className="invite-card__lead">{description}</p>
        <Link className="text-link" href="/">홈으로 돌아가기</Link>
      </div>
    </section>
  );
}
