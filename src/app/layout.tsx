import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "OpenLab · 开放科学课堂",
    template: "%s · OpenLab",
  },
  description:
    "免费开放的在线科学教育平台：虚拟实验、互动测验、图文课程与学习路径，无需账号即可学习。",
  keywords: ["科学教育", "虚拟实验", "学习路径", "免费课程", "生物", "OpenLab"],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "OpenLab · 开放科学课堂",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
