"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, SearchX, SlidersHorizontal, X } from "lucide-react";
import type { Item } from "@/lib/content/schema";
import { SUBJECT_AREAS } from "@/lib/content/schema";
import { BG_LABELS, LANG_LABELS, typeLabel } from "@/lib/content/labels";
import { ItemCard } from "@/components/content/item-card";
import { FacetSection } from "@/components/library/facet-section";
import { cn } from "@/lib/utils";

/**
 * 资料库浏览器（M1）
 * - 全文搜索：Pagefind 构建期索引（含中文分词）；dev 无索引时自动降级为本地标题/标签过滤
 * - facets 筛选：类型/学科/背景知识/时长/语言/来源/热门标签，计数 = 当前其余条件下各值的数量
 * - 排序：相关度（搜索时）/ 最新添加 / 标题 / 时长；分页 24/48/96
 * - URL 状态同步：q/type/subject/bg/duration/lang/org/tag/sort/page 可分享
 */

type FacetKey = "type" | "subject" | "bg" | "duration" | "lang" | "org" | "tag";
type Filters = Record<FacetKey, string[]>;

const FACET_KEYS = Object.keys(EMPTY_FILTERS()) as FacetKey[];

function EMPTY_FILTERS(): Filters {
  return { type: [], subject: [], bg: [], duration: [], lang: [], org: [], tag: [] };
}

const FACET_LABELS: Record<FacetKey, string> = {
  type: "内容类型",
  subject: "学科域",
  bg: "背景知识门槛",
  duration: "时长",
  lang: "语言",
  org: "来源",
  tag: "热门标签",
};

const DURATION_BUCKETS = [
  { key: "short", label: "≤ 10 分钟", test: (m: Item) => m.durationMinutes <= 10 },
  { key: "medium", label: "10–30 分钟", test: (m: Item) => m.durationMinutes > 10 && m.durationMinutes <= 30 },
  { key: "long", label: "30–60 分钟", test: (m: Item) => m.durationMinutes > 30 && m.durationMinutes <= 60 },
  { key: "xlong", label: "> 60 分钟", test: (m: Item) => m.durationMinutes > 60 },
];

const SORTS = [
  { key: "newest", label: "最新添加" },
  { key: "title", label: "标题 A–Z" },
  { key: "duration", label: "时长 短→长" },
] as const;
type SortKey = (typeof SORTS)[number]["key"] | "relevance";

const PAGE_SIZES = [24, 48, 96];
const TAG_FACET_LIMIT = 15;

function bucketOf(m: Item): string {
  for (const b of DURATION_BUCKETS) if (b.test(m)) return b.key;
  return "unknown";
}

function facetValues(m: Item, key: FacetKey): string[] {
  switch (key) {
    case "type":
      return [m.type];
    case "subject":
      return [m.subjectArea];
    case "bg":
      return [m.backgroundKnowledge];
    case "duration":
      return [bucketOf(m)];
    case "lang":
      return [m.language];
    case "org":
      return [m.organization];
    case "tag":
      return m.tags;
  }
}

/** 除 skip 维度外的全部筛选条件是否满足 */
function matches(m: Item, filters: Filters, skip?: FacetKey): boolean {
  for (const k of FACET_KEYS) {
    if (k === skip || filters[k].length === 0) continue;
    const vals = facetValues(m, k);
    if (!filters[k].some((v) => vals.includes(v))) return false;
  }
  return true;
}

function optionLabel(key: FacetKey, value: string): string {
  switch (key) {
    case "type":
      return typeLabel(value as Item["type"]);
    case "subject":
      return SUBJECT_AREAS[value] ?? value;
    case "bg":
      return BG_LABELS[value]?.label ?? value;
    case "duration":
      return DURATION_BUCKETS.find((b) => b.key === value)?.label ?? value;
    case "lang":
      return LANG_LABELS[value] ?? value;
    default:
      return value;
  }
}

function itemIdFromUrl(url: string): string {
  return decodeURIComponent(String(url).replace(/^.*\/library\/items\//, "").replace(/\/$/, ""));
}

interface PagefindResultFragment {
  data: () => Promise<{ url: string }>;
}

interface PagefindClient {
  search: (q: string) => Promise<{ results: PagefindResultFragment[] }>;
}

interface Searched {
  mode: "pending" | "pagefind" | "local";
  ids?: Set<string>;
  rank?: (id: string) => number;
  q?: string;
}

export function LibraryBrowser({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [searched, setSearched] = useState<Searched>({ mode: "pending" });
  const [indexState, setIndexState] = useState<"loading" | "ready" | "unavailable">("loading");
  const pagefindRef = useRef<PagefindClient | null>(null);
  const hydrated = useRef(false);

  /* 懒加载 Pagefind（dev 模式无索引产物 → 自动降级本地过滤） */
  useEffect(() => {
    const dynamicImport = new Function("u", "return import(u)") as (u: string) => Promise<unknown>;
    dynamicImport("/pagefind/pagefind.js")
      .then((pf) => {
        pagefindRef.current = pf as PagefindClient;
        setIndexState("ready");
      })
      .catch(() => setIndexState("unavailable"));
  }, []);

  /* 首次挂载：从 URL 恢复状态（避免 SSR/CSR 水合不一致） */
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get("q") ?? "";
    const f = EMPTY_FILTERS();
    for (const k of FACET_KEYS) {
      const v = sp.get(k);
      if (v) f[k] = v.split(",").filter(Boolean);
    }
    const s = sp.get("sort");
    setQuery(q);
    setDebounced(q);
    setFilters(f);
    if (s === "relevance" || SORTS.some((x) => x.key === s)) setSort(s as SortKey);
    const p = Number(sp.get("page"));
    if (Number.isFinite(p) && p > 0) setPage(Math.floor(p));
    hydrated.current = true;
  }, []);

  /* 输入防抖 */
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  /* 搜索时默认切到相关度排序；清空搜索回到最新 */
  useEffect(() => {
    if (debounced && sort === "newest") setSort("relevance");
    if (!debounced && sort === "relevance") setSort("newest");
  }, [debounced, sort]);

  /* 执行 Pagefind 搜索 */
  useEffect(() => {
    if (!debounced) {
      setSearched({ mode: "pending" });
      return;
    }
    if (indexState === "loading") return;
    if (indexState === "unavailable") {
      setSearched({ mode: "local", q: debounced.toLowerCase() });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await pagefindRef.current!.search(debounced);
        const datas = await Promise.all(res.results.slice(0, 200).map((r) => r.data()));
        if (cancelled) return;
        const ids = datas.map((d) => itemIdFromUrl(d.url));
        const ranks = new Map(ids.map((id, i) => [id, i]));
        setSearched({
          mode: "pagefind",
          ids: new Set(ids),
          rank: (id: string) => ranks.get(id) ?? Number.MAX_SAFE_INTEGER,
        });
      } catch {
        setIndexState("unavailable");
        setSearched({ mode: "local", q: debounced.toLowerCase() });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, indexState]);

  /* URL 状态同步（可分享的搜索链接） */
  useEffect(() => {
    if (!hydrated.current) return;
    const sp = new URLSearchParams();
    if (debounced) sp.set("q", debounced);
    for (const k of FACET_KEYS) if (filters[k].length) sp.set(k, filters[k].join(","));
    if (sort !== "newest") sp.set("sort", sort);
    if (page > 1) sp.set("page", String(page));
    const qs = sp.toString();
    window.history.replaceState(null, "", qs ? `/library/?${qs}` : "/library/");
  }, [debounced, filters, sort, page]);

  /* 搜索约束下的全集（facet 计数的基数） */
  const baseMatched = useMemo(
    () =>
      items.filter((m) => {
        if (searched.mode === "pending") return true;
        if (searched.mode === "local")
          return [m.title, m.description, ...m.tags].some((t) => t.toLowerCase().includes(searched.q!));
        return searched.ids!.has(m.id);
      }),
    [items, searched]
  );

  const filtered = useMemo(() => baseMatched.filter((m) => matches(m, filters)), [baseMatched, filters]);

  /* facets：每个选项的计数 = 满足「其余维度 + 搜索」条件的数量 */
  const facets = useMemo(() => {
    const out = {} as Record<FacetKey, { value: string; label: string; count: number }[]>;
    for (const k of FACET_KEYS) {
      const counter = new Map<string, number>();
      for (const m of baseMatched) {
        if (!matches(m, filters, k)) continue;
        for (const v of facetValues(m, k)) counter.set(v, (counter.get(v) ?? 0) + 1);
      }
      let opts = [...counter.entries()].map(([value, count]) => ({ value, count, label: optionLabel(k, value) }));
      if (k === "tag") {
        opts = opts.sort((a, b) => b.count - a.count).slice(0, TAG_FACET_LIMIT);
      } else if (k === "duration") {
        opts.sort((a, b) => DURATION_BUCKETS.findIndex((b2) => b2.key === a.value) - DURATION_BUCKETS.findIndex((b2) => b2.key === b.value));
      } else if (k !== "lang") {
        opts.sort((a, b) => b.count - a.count);
      }
      out[k] = opts;
    }
    return out;
  }, [baseMatched, filters]);

  /* 排序 + 分页 */
  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort === "title") list.sort((a, b) => a.title.localeCompare(b.title, "zh"));
    else if (sort === "duration") list.sort((a, b) => a.durationMinutes - b.durationMinutes);
    else if (sort === "relevance" && searched.mode === "pagefind") list.sort((a, b) => searched.rank!(a.id) - searched.rank!(b.id));
    else list.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    return list;
  }, [filtered, sort, searched]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggle = useCallback((k: FacetKey, v: string) => {
    setPage(1);
    setFilters((prev) => {
      const cur = prev[k];
      return { ...prev, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
    });
  }, []);

  const activeChips = FACET_KEYS.flatMap((k) => filters[k].map((v) => ({ k, v, label: optionLabel(k, v) })));
  const activeCount = activeChips.length;

  const panel = (
    <div>
      {FACET_KEYS.map((k) => (
        <FacetSection
          key={k}
          label={FACET_LABELS[k]}
          options={facets[k]}
          selected={filters[k]}
          onToggle={(v) => toggle(k, v)}
        />
      ))}
    </div>
  );

  const pill = (active: boolean) =>
    cn(
      "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
      active
        ? "border-brand-600 bg-brand-600 text-white"
        : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
    );

  return (
    <div>
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="搜索标题、描述、正文或标签…"
          className="w-full max-w-xs rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:w-72"
        />
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as SortKey);
            setPage(1);
          }}
          className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 outline-none focus:border-brand-400"
        >
          {debounced && <option value="relevance">相关度</option>}
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 outline-none focus:border-brand-400"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              每页 {n} 条
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-400">
          {searched.mode === "pending" && debounced ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              搜索中…
            </span>
          ) : indexState === "unavailable" && debounced ? (
            `${filtered.length} 个结果（本地快速过滤）`
          ) : (
            `${filtered.length} 个结果`
          )}
        </span>
      </div>

      {/* 类型 pill（保留 LabXchange 顶部的快捷入口） */}
      <div className="mt-4 flex flex-wrap gap-2">
        {(() => {
          const typeOptions = facets.type;
          // 「全部」计数 = 当前搜索约束下的总数（与 facets 计数口径一致）
          const total = baseMatched.length;
          return (
            <>
              <button
                type="button"
                onClick={() => {
                  setFilters((p) => ({ ...p, type: [] }));
                  setPage(1);
                }}
                className={pill(filters.type.length === 0)}
              >
                全部（{total}）
              </button>
              {typeOptions.map((o) => (
                <button key={o.value} type="button" onClick={() => toggle("type", o.value)} className={pill(filters.type.includes(o.value))}>
                  {o.label}（{o.count}）
                </button>
              ))}
            </>
          );
        })()}
      </div>

      {/* 已选条件 chips */}
      {activeCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {activeChips.map(({ k, v, label }) => (
            <button
              key={`${k}-${v}`}
              type="button"
              onClick={() => toggle(k, v)}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800 ring-1 ring-brand-200 transition hover:bg-brand-100"
            >
              {label}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setFilters(EMPTY_FILTERS());
              setPage(1);
            }}
            className="text-xs font-medium text-slate-400 underline-offset-2 transition hover:text-slate-600 hover:underline"
          >
            清除全部
          </button>
        </div>
      )}

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* 筛选面板：移动端抽屉 / 桌面侧栏 */}
        <details className="rounded-2xl border bg-white px-4 py-1 shadow-sm lg:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 py-2.5 text-sm font-semibold text-slate-700">
            <SlidersHorizontal className="h-4 w-4" />
            按…细化筛选{activeCount > 0 ? `（${activeCount}）` : ""}
          </summary>
          <div className="pb-3">{panel}</div>
        </details>
        <aside className="sticky top-20 hidden rounded-2xl border bg-white px-4 py-1 shadow-sm lg:block">{panel}</aside>

        {/* 结果网格 */}
        <div>
          {pageItems.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-slate-400">
              <SearchX className="h-12 w-12" />
              <p className="mt-4 text-sm">没有匹配的资源，换个关键词或减少筛选条件试试？</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {pageItems.map((meta) => (
                <ItemCard key={meta.id} meta={meta} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                className="rounded-full border px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-40"
              >
                上一页
              </button>
              <span className="text-sm text-slate-500">
                第 {safePage} / {totalPages} 页
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
                className="rounded-full border px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-40"
              >
                下一页
              </button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
