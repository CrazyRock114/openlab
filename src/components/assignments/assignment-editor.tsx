"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ClipboardList,
  FileDown,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Item } from "@/lib/content/schema";
import { typeIcon, typeLabel } from "@/lib/content/labels";
import { downloadJson } from "@/lib/assignments/schema";
import { getDB, newAssignmentId, type AssignmentRecord } from "@/lib/db";

function blankAssignment(): AssignmentRecord {
  const now = Date.now();
  return {
    assignmentId: newAssignmentId(),
    role: "created",
    title: "",
    teacherName: "",
    description: "",
    items: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 作业编辑器（教师端）：从资料库组卷 → 每项设置分值/每题限次 → 截止日期
 * → 导出 assignment.json 发给学生（学生导入即进入作业模式）
 */
export function AssignmentEditor({ items, quizTotals = {} }: { items: Item[]; quizTotals?: Record<string, number> }) {
  const [draft, setDraft] = useState<AssignmentRecord | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const id = new URLSearchParams(window.location.search).get("id");
    void getDB()
      ?.assignments.get(id ?? "")
      .then((found) => setDraft(found ?? blankAssignment()));
  }, []);

  /* 自动保存 */
  useEffect(() => {
    if (!draft) return;
    const t = window.setTimeout(async () => {
      const db = getDB();
      if (!db) return;
      await db.assignments.put({ ...draft, updatedAt: Date.now() });
      setSavedAt(Date.now());
    }, 800);
    return () => window.clearTimeout(t);
  }, [draft]);

  const patch = useCallback(
    (p: Partial<AssignmentRecord>) => setDraft((d) => (d ? { ...d, ...p } : d)),
    []
  );

  const exportAssignment = () => {
    if (!draft) return;
    downloadJson(
      {
        format: "openlab-assignment",
        version: 1,
        assignmentId: draft.assignmentId,
        title: draft.title,
        teacherName: draft.teacherName || "老师",
        description: draft.description,
        dueDate: draft.dueDate,
        items: draft.items.map((i) => ({
          itemId: i.itemId,
          title: i.title,
          maxAttempts: i.maxAttempts,
          points: i.points,
        })),
      },
      `${(draft.title || "assignment").replace(/[\\/:*?"<>|]/g, "_")}.json`
    );
  };

  const removeDraft = async () => {
    const db = getDB();
    if (!db || !draft) return;
    await db.assignments.delete(draft.assignmentId);
    window.location.href = "/assignments/";
  };

  if (!draft) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在加载编辑器…
      </div>
    );
  }

  const picked = new Set(draft.items.map((i) => i.itemId));
  const q = pickerQuery.trim().toLowerCase();
  const pickerResults = items
    .filter((m) => !picked.has(m.id))
    .filter((m) => !q || [m.title, m.description, ...m.tags].some((t) => t.toLowerCase().includes(q)))
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/assignments"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" />
          作业中心
        </Link>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          作业草稿（仅保存在本机）
        </span>
        <span className="text-xs text-slate-400">
          {savedAt
            ? `已自动保存 ${new Date(savedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`
            : "编辑后自动保存"}
        </span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={exportAssignment}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <FileDown className="h-4 w-4" />
            导出布置文件
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

      <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <input
          value={draft.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="作业标题，如：第一章 遗传学基础练习"
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-lg font-semibold outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            value={draft.teacherName}
            onChange={(e) => patch({ teacherName: e.target.value })}
            placeholder="教师姓名"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400"
          />
          <input
            type="date"
            value={draft.dueDate ?? ""}
            onChange={(e) => patch({ dueDate: e.target.value || undefined })}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 outline-none transition focus:border-brand-400"
          />
          <input
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="备注（选填）"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400"
          />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">作业内容（{draft.items.length}）</h2>
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
                      onClick={() =>
                        setDraft((d) =>
                          d
                            ? {
                                ...d,
                                items: [
                                  ...d.items,
                                  {
                                    itemId: m.id,
                                    title: m.title,
                                    maxAttempts: null,
                                    points: quizTotals[m.id] ?? 10,
                                  },
                                ],
                              }
                            : d
                        )
                      }
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

        {draft.items.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed py-10 text-center text-sm text-slate-400">
            还没有内容——添加问题集用于计分测验，也可以搭配图文/视频/模拟实验
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {draft.items.map((it, idx) => {
              const meta = items.find((m) => m.id === it.itemId);
              const Icon = typeIcon(meta?.type ?? "lx_text");
              return (
                <li key={it.itemId} className="rounded-xl border border-slate-200 p-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                      {idx + 1}
                    </span>
                    <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{it.title ?? it.itemId}</span>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((d) => {
                            if (!d || idx === 0) return d;
                            const items = [...d.items];
                            [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
                            return { ...d, items };
                          })
                        }
                        disabled={idx === 0}
                        title="上移"
                        className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((d) => {
                            if (!d || idx === d.items.length - 1) return d;
                            const items = [...d.items];
                            [items[idx + 1], items[idx]] = [items[idx], items[idx + 1]];
                            return { ...d, items };
                          })
                        }
                        disabled={idx === draft.items.length - 1}
                        title="下移"
                        className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraft((d) => (d ? { ...d, items: d.items.filter((_, i) => i !== idx) } : d))}
                        title="移除"
                        className="rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 pl-9 text-xs text-slate-500">
                    <label className="flex items-center gap-1.5">
                      分值
                      <input
                        type="number"
                        min={1}
                        value={it.points}
                        onChange={(e) =>
                          setDraft((d) => {
                            if (!d) return d;
                            const items = [...d.items];
                            items[idx] = { ...items[idx], points: Math.max(1, Number(e.target.value) || 1) };
                            return { ...d, items };
                          })
                        }
                        className="w-16 rounded-md border border-slate-200 px-2 py-1 outline-none focus:border-brand-400"
                      />
                    </label>
                    <label className="flex items-center gap-1.5">
                      每题限次
                      <input
                        type="number"
                        min={1}
                        placeholder="不限"
                        value={it.maxAttempts ?? ""}
                        onChange={(e) =>
                          setDraft((d) => {
                            if (!d) return d;
                            const items = [...d.items];
                            const v = e.target.value === "" ? null : Math.max(1, Number(e.target.value) || 1);
                            items[idx] = { ...items[idx], maxAttempts: v };
                            return { ...d, items };
                          })
                        }
                        className="w-16 rounded-md border border-slate-200 px-2 py-1 outline-none placeholder:text-slate-300 focus:border-brand-400"
                      />
                      次
                    </label>
                    {meta && <span>预计 {meta.durationMinutes} 分钟</span>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {draft.items.length > 0 && (
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-400">
            <ClipboardList className="h-3.5 w-3.5" />
            总分 {draft.items.reduce((s, i) => s + i.points, 0)} 分 · 导出后把 JSON 文件发给学生即可
          </p>
        )}
      </section>
    </div>
  );
}
