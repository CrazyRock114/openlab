import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Layers, Route } from "lucide-react";
import { getClusters, getPathways } from "@/lib/content/repository";

export const metadata: Metadata = {
  title: "学习路径",
  description: "按顺序学完一系列资源：图文 → 视频 → 测验 → 虚拟实验，系统构建知识体系。",
};

export default function PathwaysPage() {
  const pathways = getPathways();
  const clusters = getClusters();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">学习路径</h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          学习路径把多个资源编排成有顺序的迷你课程，沿着它一步步推进即可系统掌握一个主题。
        </p>
      </header>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pathways.map((p) => (
          <Link
            key={p.id}
            href={`/library/pathway/${p.id}`}
            className="group flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-brand-600 text-white">
              <Route className="h-5 w-5" />
            </span>
            <h2 className="mt-3.5 font-semibold leading-snug transition group-hover:text-brand-700">
              {p.title}
            </h2>
            <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-slate-500">{p.description}</p>
            <div className="mt-3.5 flex gap-3 text-xs text-slate-400">
              <span>{p.entries.length} 个条目</span>
              {p.learningObjectives.length > 0 && (
                <span>{p.learningObjectives.length} 个学习目标</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {clusters.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-bold tracking-tight">群集</h2>
          <p className="mt-1.5 text-sm text-slate-500">围绕同一主题的多条学习路径合集。</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {clusters.map((c) => (
              <Link
                key={c.id}
                href={`/library/clusters/${c.id}`}
                className="group flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                  <Layers className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold transition group-hover:text-brand-700">{c.title}</h3>
                  <p className="mt-0.5 truncate text-sm text-slate-500">{c.description}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {c.pathways.length} 条路径 · {c.tags.slice(0, 3).join(" / ")}
                  </p>
                </div>
                <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-slate-300" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
