"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { getSupabaseClient } from "@/lib/supabase/client";

export function SwitchAccountButton({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function switchAccount() {
    setError(null);
    setIsPending(true);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Supabase 연결 설정을 확인해 주세요.");
      setIsPending(false);
      return;
    }

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError("로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setIsPending(false);
      return;
    }

    router.replace(`/login?next=${encodeURIComponent(returnTo)}`);
    router.refresh();
  }

  return (
    <>
      {error ? <p className="form-message" role="alert">{error}</p> : null}
      <button className="secondary-button" type="button" onClick={switchAccount} disabled={isPending}>
        {isPending ? "로그아웃하는 중…" : "다른 계정으로 로그인"}
      </button>
    </>
  );
}
