import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "까꿍이 준비실",
    template: "%s | 까꿍이 준비실",
  },
  description: "부부가 함께 관리하는 임신·출산 준비 공간",
};

export const viewport: Viewport = {
  themeColor: "#fffaf5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
