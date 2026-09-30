"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  BookmarkCheck,
  CheckCircle2,
  FileDown,
  FolderPen,
  ListChecks,
  Pencil,
  Route,
  Trash2,
} from "lucide-react";
import type { Item } from "@/lib/content/schema";
import { ItemCard } from "@/components/content/item-card";
import { downloadDraftJson } from "@/lib/draft-export";
import {
  getDB,
  migrateLegacyProgress,
  type DraftPathwayRecord,
  type LearnerProfile,
} from "@/lib/db";
import { useLiveQueryDefault } from "@/lib/live-query";

interface PathwaySummary {
  id: string;
  title: string;
  entryItemIds: string[];
}

export function DashboardClient({
  items,
  pathways,
}: {
  items: Item[];
  pathways: PathwaySummary[];
}) {
  const progressMap =
    useLiveQueryDefault(async () => {
      const db = getDB();
      if (!db) return {};
      const records = await db.progress.toArray();
      return Object.fromEntries(records.map((r) => [r.itemId, r.completed]));
    }, [], {} as Record<string, boolean>) ?? {};

  const favoriteIds =
    useLiveQueryDefault(async () => {
      const db = getDB();
      if (!db) return [];
      const all = await db.favorites.toArray();
      return all.sort((a, b) => b.addedAt - a.addedAt).map((f) => f.itemId);
    }, [], [] as string[]) ?? [];

  const drafts =
    useLiveQueryDefault(async () => {
      const db = getDB();
      if (!db) return [];
      const all = await db.drafts.toArray();
      return all.sort((a, b) => b.updatedAt - a.updatedAt);
    }, [], [] as DraftPathwayRecord[]) ?? [];

  const [migrationNote, setMigrationNote] = useState("");

  const profile =
    useLiveQueryDefault(async () => {
      const db = getDB();
      if (!db) return null;
      return ((await db.settings.get("profile"))?.value as LearnerProfile | undefined) ?? null;
    }, [], null as LearnerProfile | null) ?? null;

  /* M0 localStorage 进度 → IndexedDB 一次性迁移 */
  useEffect(() => {
    void migrateLegacyProgress().then((n) => {
      if (n > 0) setMigrationNote(`已自动迁移 ${n} 条本地学习进度`);
    });
  }, []);

  const completedCount = Object.values(progressMap).filter(Boolean).length;
  const byId = new Map(items.map((m) => [m.id, m]));
  const favoriteItems = favoriteIds.map((id) => byId.get(id)).filter((m) => m !== undefined);

  const removeDraft = async (draftId: string) => {
    const db = getDB();
    if (!db) return;
    await db.drafts.delete(draftId);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {profile ? `你好，${profile.name}` : "我的学习"}
          </h1>
          <p className="mt-2 text-slate-500">
            学习进度、收藏与路径草稿都保存在本机浏览器中，无需注册账号。
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/assignments"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
          >
            作业中心
          </Link>
          <Link
            href="/library/pathway/edit"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <FolderPen className="h-4 w-4" />
            新建路径草稿
          </Link>
        </div>
      </header>

      {!profile && (
        <Link
          href="/onboarding"
          className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-indigo-50 px-5 py-4 transition hover:shadow-md"
        >
          <span className="text-2xl">👋</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-brand-900">花 30 秒完善你的学习档案</p>
            <p className="text-sm text-brand-900/70">告诉我们你的身份与感兴趣的科目——数据只存在本机浏览器。</p>
          </div>
          <span className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">开始</span>
        </Link>
      )}

      {migrationNote && (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {migrationNote}
        </p>
      )}

      {/* 统计 */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { icon: ListChecks, label: "已完成资源", value: completedCount, href: null },
          { icon: BookmarkCheck, label: "收藏", value: favoriteItems.length, href: "#favorites" },
          { icon: Route, label: "路径草稿", value: drafts.length, href: "#drafts" },
        ].map((card) => (
          <div key={card.label} className="flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <card.icon className="h-5 w-5" />
            </span>
            <div>
              {card.href ? (
                <a href={card.href} className="text-2xl font-bold hover:text-brand-700">
                  {card.value}
                </a>
              ) : (
                <span className="text-2xl font-bold">{card.value}</span>
              )}
              <p className="text-sm text-slate-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-2">
        {/* 学习路径进度 */}
        <section>
          <h2 className="text-lg font-bold">学习路径进度</h2>
          <div className="mt-4 space-y-3">
            {pathways.map((p) => {
              const done = p.entryItemIds.filter((id) => progressMap[id]).length;
              const total = p.entryItemIds.length;
              const percent = total === 0 ? 0 : Math.round((done / total) * 100);
              return (
                <Link
                  key={p.id}
                  href={`/library/pathway/${p.id}`}
                  className="block rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate font-medium">{p.title}</span>
                    <span
                      className={
                        percent === 100
                          ? "shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                          : "shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500"
                      }
                    >
                      {percent === 100 ? "已完成" : percent > 0 ? "进行中" : "未开始"}
                    </span>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={
                        percent === 100
                          ? "h-full rounded-full bg-emerald-500 transition-all duration-500"
                          : "h-full rounded-full bg-brand-500 transition-all duration-500"
                      }
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    {done}/{total} 个条目 · {percent}%
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 路径草稿 */}
        <section id="drafts">
          <h2 className="text-lg font-bold">我的路径草稿</h2>
          {drafts.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed p-6 text-center text-sm text-slate-400">
              还没有草稿。克隆一条公共路径试试「Remix」，或
              <Link href="/library/pathway/edit" className="text-brand-700 hover:underline">
                从零创建
              </Link>
              。
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {drafts.map((d) => (
                <div key={d.draftId} className="rounded-2xl border bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{d.title || "未命名路径"}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {d.entries.length} 个条目 · 更新于{" "}
                        {new Date(d.updatedAt).toLocaleDateString("zh-CN")}
                        {d.clonedFrom && " · Remix"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Link
                        href={`/library/pathway/edit/?id=${encodeURIComponent(d.draftId)}`}
                        title="编辑"
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-brand-50 hover:text-brand-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        title="导出 JSON"
                        onClick={() => downloadDraftJson(d)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-brand-50 hover:text-brand-700"
                      >
                        <FileDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="删除"
                        onClick={() => void removeDraft(d.draftId)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 收藏 */}
      <section id="favorites" className="mt-12">
        <h2 className="text-lg font-bold">收藏的资源</h2>
        {favoriteItems.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed p-6 text-center text-sm text-slate-400">
            还没有收藏——在资料库或资源详情页点「收藏」即可保存到这里。
          </p>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {favoriteItems.map((meta) => (
              <ItemCard key={meta.id} meta={meta} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
