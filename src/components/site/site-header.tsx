import Link from "next/link";
import { FlaskConical, Search } from "lucide-react";

const NAV = [
  { href: "/", label: "首页" },
  { href: "/library", label: "资料库" },
  { href: "/library/pathways", label: "学习路径" },
  { href: "/assignments", label: "作业" },
  { href: "/dashboard", label: "我的学习" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <FlaskConical className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="leading-tight">
            <span className="block text-[17px] font-bold tracking-tight">OpenLab</span>
            <span className="block text-[11px] text-slate-500">开放科学课堂</span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/library"
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-500 transition hover:border-brand-300 hover:text-brand-700"
          >
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">搜索资源…</span>
          </Link>
          <span
            title="账号功能将在后续版本上线"
            className="hidden cursor-not-allowed rounded-full px-3.5 py-2 text-sm font-medium text-slate-400 sm:inline-block"
          >
            登录
          </span>
          <span
            title="账号功能将在后续版本上线"
            className="cursor-not-allowed rounded-full bg-brand-600/50 px-4 py-2 text-sm font-semibold text-white/90"
          >
            免费加入
          </span>
        </div>
      </div>
    </header>
  );
}
