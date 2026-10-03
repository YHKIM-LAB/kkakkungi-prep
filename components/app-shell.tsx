import Link from "next/link";
import type { ReactNode } from "react";

import { BottomNavigation } from "@/components/bottom-navigation";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <Link className="wordmark" href="/" aria-label="까꿍이 준비실 홈">
            <span className="wordmark__mark" aria-hidden="true">까</span>
            <span>까꿍이 준비실</span>
          </Link>
          <p>우리 둘이 함께 차근차근</p>
        </div>
      </header>
      <main className="page-container">{children}</main>
      <BottomNavigation />
    </div>
  );
}
