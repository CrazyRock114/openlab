import Link from "next/link";
import { FlaskConical } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-ink-900 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white">
              <FlaskConical className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold text-white">OpenLab</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            免费开放的在线科学课堂。在浏览器里做实验、刷题、沿路径系统学习。
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">学习</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/library" className="transition hover:text-white">资料库</Link></li>
            <li><Link href="/library/pathways" className="transition hover:text-white">学习路径</Link></li>
            <li><Link href="/library/clusters/biology-core" className="transition hover:text-white">群集</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">内容类型</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
            <li>模拟实验</li>
            <li>互动测验</li>
            <li>图文课程</li>
            <li>视频</li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">关于</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
            <li>本站为开源演示项目</li>
            <li>内容采用 CC 等开放许可</li>
            <li>M0 骨架版本 · v0.1</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-slate-500">
          © {new Date().getFullYear()} OpenLab · 开放科学课堂（教学演示项目）
        </div>
      </div>
    </footer>
  );
}
