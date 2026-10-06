"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";

export function AuthForm({ redirectTo = "/" }: { redirectTo?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const supabase = getSupabaseClient();

    if (!supabase) {
      setMessage("Supabase 연결 설정을 확인해 주세요.");
      setIsPending(false);
      return;
    }

    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage(error.message === "Invalid login credentials" ? "이메일 또는 비밀번호를 확인해 주세요." : error.message);
        setIsPending(false);
        return;
      }

      router.replace(redirectTo);
      router.refresh();
      return;
    }

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", redirectTo);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl.toString() },
    });

    if (error) {
      setMessage(error.message);
      setIsPending(false);
      return;
    }

    if (data.session) {
      router.replace(redirectTo);
      router.refresh();
      return;
    }

    setMessage("가입 확인 메일을 보냈어요. 메일의 링크를 눌러 가입을 완료해 주세요.");
    setIsPending(false);
  }

  return (
    <div className="auth-card">
      <div className="auth-tabs" role="tablist" aria-label="인증 방식">
        <button type="button" role="tab" aria-selected={mode === "sign-in"} onClick={() => { setMode("sign-in"); setMessage(null); }}>
          로그인
        </button>
        <button type="button" role="tab" aria-selected={mode === "sign-up"} onClick={() => { setMode("sign-up"); setMessage(null); }}>
          회원가입
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          이메일
          <input name="email" type="email" autoComplete="email" placeholder="name@example.com" required />
        </label>
        <label>
          비밀번호
          <input
            name="password"
            type="password"
            minLength={8}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            placeholder="8자 이상 입력해 주세요"
            required
          />
        </label>
        {message ? <p className="form-message" role="status">{message}</p> : null}
        <button className="primary-button" type="submit" disabled={isPending}>
          {isPending ? "처리 중…" : mode === "sign-in" ? "로그인" : "계정 만들기"}
        </button>
      </form>
    </div>
  );
}
