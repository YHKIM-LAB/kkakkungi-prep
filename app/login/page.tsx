import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSafeRedirect } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "로그인",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const redirectTo = getSafeRedirect(next);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect(redirectTo === "/" ? "/setup" : redirectTo);
  }

  return (
    <section className="auth-page">
      <div className="auth-intro">
        <span className="auth-intro__mark" aria-hidden="true">까</span>
        <p className="eyebrow">우리 둘의 준비 공간</p>
        <h1>까꿍이를 만나는 날까지<br />함께 준비해요.</h1>
        <p>로그인하면 임신 주차와 준비 기록을 가족과 안전하게 공유할 수 있어요.</p>
      </div>
      <AuthForm redirectTo={redirectTo} />
    </section>
  );
}
