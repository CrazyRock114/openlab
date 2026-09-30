"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  FileDown,
  GraduationCap,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Item } from "@/lib/content/schema";
import { LICENSES } from "@/lib/content/schema";
import { LICENSE_LABELS, typeIcon, typeLabel } from "@/lib/content/labels";
import { downloadDraftJson } from "@/lib/draft-export";
import { getDB, newDraftId, type DraftPathwayRecord } from "@/lib/db";
import { cn } from "@/lib/utils";

function blankDraft(): DraftPathwayRecord {
  const now = Date.now();
  return {
    draftId: newDraftId(),
    title: "",
    description: "",
    learningObjectives: [],
    language: "zh-hans",
    license: "CC_BY_4",
    authorName: "本机创作者",
    entries: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 路径草稿编辑器（M2）
 * - 自动保存到 IndexedDB（防抖 800ms），URL ?id= 同步后可回访
 * - 从资料库挑选条目 / 排序 / 教师备注
 * - 导出 JSON（可分享，或提 PR 进公共内容库）
 */
export function PathwayEditor({ items }: { items: Item[] }) {
  const [draft, setDraft] = useState<DraftPathwayRecord | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const loadedRef = useRef(false);
  const urlSyncedRef = useRef(false);

  /* 载入：?id= 有则读草稿，无则新建 */
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const id = new URLSearchParams(window.location.search).get("id");
    const run = async () => {
      const db = getDB();
      const found = id && db ? await db.drafts.get(id) : undefined;
      setDraft(found ?? blankDraft());
    };
    void run();
  }, []);

  /* 自动保存（防抖）+ 首次保存后同步 URL；全空草稿不落库，避免幽灵记录 */
  useEffect(() => {
    if (!draft) return;
    if (!draft.title.trim() && !draft.description.trim() && draft.entries.length === 0) return;
    const t = window.setTimeout(async () => {
      const db = getDB();
      if (!db) return;
      await db.drafts.put({ ...draft, updatedAt: Date.now() });
      setSavedAt(Date.now());
      if (!urlSyncedRef.current) {
        urlSyncedRef.current = true;
        window.history.replaceState(null, "", `/library/pathway/edit/?id=${encodeURIComponent(draft.draftId)}`);
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [draft]);

  const patch = useCallback((p: Partial<DraftPathwayRecord>) => setDraft((d) => (d ? { ...d, ...p } : d)), []);

  const entryOps = useMemo(
    () => ({
      add: (itemId: string) =>
        setDraft((d) => (d ? { ...d, entries: [...d.entries, { itemId }] } : d)),
      remove: (idx: number) =>
        setDraft((d) => (d ? { ...d, entries: d.entries.filter((_, i) => i !== idx) } : d)),
      move: (idx: number, dir: -1 | 1) =>
        setDraft((d) => {
          if (!d) return d;
          const next = [...d.entries];
          const j = idx + dir;
          if (j < 0 || j >= next.length) return d;
          [next[idx], next[j]] = [next[j], next[idx]];
          return { ...d, entries: next };
        }),
      notes: (idx: number, educatorNotes: string) =>
        setDraft((d) => {
          if (!d) return d;
          const entries = [...d.entries];
          entries[idx] = { ...entries[idx], educatorNotes: educatorNotes || undefined };
          return { ...d, entries };
        }),
    }),
    []
  );

  const removeDraft = async () => {
    const db = getDB();
    if (!db || !draft) return;
    await db.drafts.delete(draft.draftId);
    window.location.href = "/dashboard/";
  };

  if (!draft) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在加载编辑器…
      </div>
    );
  }

  const inPathway = new Set(draft.entries.map((e) => e.itemId));
  const q = pickerQuery.trim().toLowerCase();
  const pickerResults = items
    .filter((m) => !inPathway.has(m.id))
    .filter((m) => !q || [m.title, m.description, ...m.tags].some((t) => t.toLowerCase().includes(q)))
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* 顶栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" />
          我的学习
        </Link>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          草稿路径（仅保存在本机）
        </span>
        <span className="text-xs text-slate-400">
          {savedAt
            ? `已自动保存 ${new Date(savedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`
            : "编辑后自动保存"}
        </span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => downloadDraftJson(draft)}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
          >
            <FileDown className="h-4 w-4" />
            导出 JSON
          </button>
          <button
            type="button"
            onClick={() => void removeDraft()}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium text-rose-500 transition hover:border-rose-300 hover:bg-rose-50"
          >
            <Trash2 className="h-4 w-4" />
            删除
          </button>
        </div>
      </div>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* 左：路径元信息 + 条目 */}
        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            <input
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="路径标题，如：遗传学进阶：从基因到表型"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-lg font-semibold outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <textarea
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
              rows={3}
              placeholder="路径简介：这条路径适合谁、按什么顺序学、学完能做什么"
              className="mt-3 w-full resize-y rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-slate-400">作者</span>
                <input
                  value={draft.authorName}
                  onChange={(e) => patch({ authorName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
              </label>
              <label className="text-sm">
                <span className="text-slate-400">许可</span>
                <select
                  value={draft.license}
                  onChange={(e) => patch({ license: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
                >
                  {LICENSES.map((l) => (
                    <option key={l} value={l}>
                      {LICENSE_LABELS[l]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* 学习目标 */}
            <div className="mt-4">
              <span className="text-sm text-slate-400">学习目标</span>
              <ul className="mt-2 space-y-2">
                {draft.learningObjectives.map((o, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-brand-500">•</span>
                    <input
                      value={o}
                      onChange={(e) => {
                        const next = [...draft.learningObjectives];
                        next[i] = e.target.value;
                        patch({ learningObjectives: next });
                      }}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-400"
                    />
                    <button
                      type="button"
                      onClick={() => patch({ learningObjectives: draft.learningObjectives.filter((_, j) => j !== i) })}
                      className="text-slate-400 transition hover:text-rose-500"
                      title="删除"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => patch({ learningObjectives: [...draft.learningObjectives, ""] })}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-700 transition hover:text-brand-800"
              >
                <Plus className="h-4 w-4" />
                添加学习目标
              </button>
            </div>
          </section>

          {/* 条目列表 */}
          <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">
                路径条目（{draft.entries.length}）
              </h2>
              <button
                type="button"
                onClick={() => setShowPicker((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" />
                从资料库添加
              </button>
            </div>

            {showPicker && (
              <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/40 p-3">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    placeholder="搜索标题、描述或标签…"
                    className="min-w-0 flex-1 text-sm outline-none"
                  />
                </div>
                <ul className="mt-2 divide-y divide-slate-100">
                  {pickerResults.map((m) => {
                    const Icon = typeIcon(m.type);
                    return (
                      <li key={m.id} className="flex items-center gap-2.5 py-2">
                        <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1 truncate text-sm">{m.title}</span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                          {typeLabel(m.type)}
                        </span>
                        <button
                          type="button"
                          onClick={() => entryOps.add(m.id)}
                          className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-50"
                        >
                          添加
                        </button>
                      </li>
                    );
                  })}
                  {pickerResults.length === 0 && (
                    <li className="py-3 text-center text-sm text-slate-400">没有可添加的资源</li>
                  )}
                </ul>
              </div>
            )}

            {draft.entries.length === 0 ? (
              <p className="mt-6 rounded-xl border border-dashed py-10 text-center text-sm text-slate-400">
                还没有条目——点「从资料库添加」，按学习顺序依次加入（推荐 6–15 个）
              </p>
            ) : (
              <ol className="mt-4 space-y-3">
                {draft.entries.map((e, idx) => {
                  const meta = items.find((m) => m.id === e.itemId);
                  if (!meta) return null;
                  const Icon = typeIcon(meta.type);
                  return (
                    <li key={e.itemId} className="rounded-xl border border-slate-200 p-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                          {idx + 1}
                        </span>
                        <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{meta.title}</span>
                        <span className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 sm:inline">
                          {typeLabel(meta.type)}
                        </span>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => entryOps.move(idx, -1)}
                            disabled={idx === 0}
                            title="上移"
                            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => entryOps.move(idx, 1)}
                            disabled={idx === draft.entries.length - 1}
                            title="下移"
                            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => entryOps.remove(idx)}
                            title="移除"
                            className="rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <input
                        value={e.educatorNotes ?? ""}
                        onChange={(ev) => entryOps.notes(idx, ev.target.value)}
                        placeholder="教师备注（可选）：这一步怎么学、注意什么"
                        className="mt-2.5 w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:bg-white"
                      />
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        {/* 右：说明 */}
        <aside className="space-y-5">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <GraduationCap className="h-4 w-4 text-brand-600" />
              草稿路径能做什么
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
              <li>· 在你自己的班级里按此路径布置学习（M3 布置码上线后）</li>
              <li>· 「导出 JSON」得到标准格式文件，可直接提交 PR 进入公共资料库</li>
              <li>· 数据仅存于本机浏览器（IndexedDB），清除浏览器数据前请先导出</li>
            </ul>
          </section>
          <section className="rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
            <h3 className="text-sm font-semibold text-brand-900">小贴士</h3>
            <p className="mt-2 text-sm leading-relaxed text-brand-900/80">
              官方推荐一条路径 6–15 个资源、时长 20–60 分钟；图文 → 视频 → 测验 → 虚拟实验的顺序对初学者最友好。
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
