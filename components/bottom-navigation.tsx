"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconName = "home" | "tasks" | "shopping" | "schedule" | "expenses";

const navigation: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/", label: "홈", icon: "home" },
  { href: "/tasks", label: "할 일", icon: "tasks" },
  { href: "/shopping", label: "준비물", icon: "shopping" },
  { href: "/schedule", label: "일정", icon: "schedule" },
  { href: "/expenses", label: "비용", icon: "expenses" },
];

const iconPaths: Record<IconName, React.ReactNode> = {
  home: <path d="m3 10.8 9-7.3 9 7.3v9.7h-6v-6H9v6H3Z" />,
  tasks: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  shopping: <path d="M6.5 8h11l1 12h-13Zm3 0V6a2.5 2.5 0 0 1 5 0v2" />,
  schedule: <path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />,
  expenses: <path d="M4 6.5h16v12H4Zm0 3.5h16M8 15h3" />,
};

function NavigationIcon({ name }: { name: IconName }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {iconPaths[name]}
    </svg>
  );
}

export function BottomNavigation() {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/setup" || pathname.startsWith("/auth/")) {
    return null;
  }

  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      <div className="bottom-nav__inner">
        {navigation.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="bottom-nav__link"
              data-active={isActive}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="bottom-nav__icon"><NavigationIcon name={item.icon} /></span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
