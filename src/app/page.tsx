import Link from "next/link";
import { ArrowRight, PenLine, Route, Search, Sparkles } from "lucide-react";
import { contentSummary, getHome, getItem, getPathway } from "@/lib/content/repository";
import { ItemCard } from "@/components/content/item-card";
import { TypeCover } from "@/components/content/type-cover";

export default function HomePage() {
  const home = getHome();
  const summary = contentSummary();
  const highlight = home.highlightPathwayId ? getPathway(home.highlightPathwayId) : undefined;

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 lg:grid-cols-2 lg:pb-24 lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm ring-1 ring-brand-100">
              <Sparkles className="h-3.5 w-3.5" />
              完全免费 · 无需账号
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              {home.hero.title}
            </h1>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-slate-500">
              {home.hero.subtitle}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={home.hero.primaryCta.href}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700"
              >
                {home.hero.primaryCta.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={home.hero.secondaryCta.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
              >
                {home.hero.secondaryCta.label}
              </Link>
            </div>

            {/* 搜索框：GET 表单，无 JS 也可用 */}
            <form
              action="/library"
              method="get"
              className="mt-6 flex max-w-md overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm transition focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100"
            >
              <input
                name="q"
                placeholder="搜索模拟实验、课程、题库…"
                className="min-w-0 flex-1 bg-transparent px-5 py-3 text-sm outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="flex shrink-0 items-center gap-1.5 bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                <Search className="h-4 w-4" />
                搜索
              </button>
            </form>

            <p className="mt-6 text-sm text-slate-400">
              {summary.published} 个免费资源 · {summary.pathways} 条学习路径 ·{" "}
              {Object.keys(summary.byType).length} 种内容类型
            </p>
          </div>

          {/* 类型卡片拼贴 */}
          <div className="relative hidden h-80 lg:block" aria-hidden>
            <div className="absolute left-2 top-6 w-56 -rotate-6 overflow-hidden rounded-2xl border bg-white shadow-xl">
              <div className="h-28">
                <TypeCover type="lx_simulation" />
              </div>
              <p className="p-3 text-xs font-semibold">凝胶电泳虚拟实验</p>
            </div>
            <div className="absolute right-2 top-0 w-56 rotate-3 overflow-hidden rounded-2xl border bg-white shadow-xl">
              <div className="h-28">
                <TypeCover type="video" />
              </div>
              <p className="p-3 text-xs font-semibold">免疫系统是如何工作的</p>
            </div>
            <div className="absolute bottom-2 left-24 w-56 rotate-2 overflow-hidden rounded-2xl border bg-white shadow-xl">
              <div className="h-28">
                <TypeCover type="assignment" />
              </div>
              <p className="p-3 text-xs font-semibold">DNA 与遗传 · 随堂测验</p>
            </div>
            <span className="absolute -left-2 bottom-16 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
              模拟实验
            </span>
            <span className="absolute right-8 bottom-4 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow-lg">
              零基础友好
            </span>
          </div>
        </div>
      </section>

      {/* 精选内容（content/home.json 可配置区块） */}
      {home.featured.map((block) => (
        <section key={block.title} className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold tracking-tight">{block.title}</h2>
            <Link
              href="/library"
              className="text-sm font-medium text-brand-700 transition hover:text-brand-800"
            >
              查看全部 →
            </Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {block.itemIds
              .map((id) => getItem(id))
              .filter((i): i is NonNullable<typeof i> => Boolean(i))
              .map((item) => (
                <ItemCard key={item.meta.id} meta={item.meta} />
              ))}
          </div>
        </section>
      ))}

      {/* 重点路径横幅 */}
      {highlight && (
        <section className="mx-auto max-w-6xl px-4 py-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-brand-600 to-violet-600 px-6 py-10 text-white sm:px-10">
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
              aria-hidden
            />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <Route className="h-3.5 w-3.5" />
              学习路径
            </span>
            <h2 className="mt-4 text-2xl font-bold sm:text-3xl">{highlight.title}</h2>
            <p className="mt-2 max-w-2xl leading-relaxed text-brand-100">{highlight.description}</p>
            <Link
              href={`/library/pathway/${highlight.id}`}
              className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50"
            >
              开始学习
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center text-2xl font-bold tracking-tight">三步开始科学学习</h2>
        <div className="mt-9 grid gap-5 sm:grid-cols-3">
          {[
            {
              icon: Search,
              step: "01",
              title: "探索",
              desc: "在资料库中浏览模拟实验、视频、测验与图文课程，按背景知识门槛找到适合你的起点。",
              href: "/library",
              cta: "打开资料库",
            },
            {
              icon: Route,
              step: "02",
              title: "系统学习",
              desc: "沿学习路径按顺序推进：图文 → 视频 → 测验 → 虚拟实验，进度自动保存在本地。",
              href: "/library/pathways",
              cta: "查看路径",
            },
            {
              icon: PenLine,
              step: "03",
              title: "创作与分享",
              desc: "教育者创作工具（路径编辑器 / 题库构建器 / 布置码）将在后续版本上线。",
              href: null,
              cta: "敬请期待",
            },
          ].map((card) => (
            <div
              key={card.step}
              className="flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <card.icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-bold tracking-widest text-slate-300">{card.step}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{card.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{card.desc}</p>
              {card.href ? (
                <Link
                  href={card.href}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 transition hover:text-brand-800"
                >
                  {card.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <span className="mt-4 inline-flex items-center text-sm font-medium text-slate-300">
                  {card.cta}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 底部 CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-4">
        <div className="rounded-3xl bg-ink-900 px-6 py-12 text-center text-white sm:px-10">
          <h2 className="text-2xl font-bold sm:text-3xl">现在就开始探索</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">
            所有内容免费开放，无需注册账号——点开任何一个资源即可开始学习。
          </p>
          <Link
            href="/library"
            className="mt-7 inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-7 py-3 text-sm font-semibold text-white transition hover:bg-brand-400"
          >
            进入资料库
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
