"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CalendarClock,
  ChevronDown,
  ClipboardList,
  Copy,
  FileDown,
  FileJson,
  FilePlus2,
  Inbox,
  Trash2,
  Upload,
} from "lucide-react";
import type { Item } from "@/lib/content/schema";
import {
  AssignmentFileSchema,
  buildReport,
  downloadJson,
  reportToText,
} from "@/lib/assignments/schema";
import { getDB, type AssignmentRecord } from "@/lib/db";
import { cn } from "@/lib/utils";

export function AssignmentHub({ items }: { items: Item[] }) {
  const assignments =
    useLiveQuery(async () => {
      const db = getDB();
      if (!db) return [];
      const all = await db.assignments.toArray();
      return all.sort((a, b) => b.updatedAt - a.updatedAt);
    }, [], [] as AssignmentRecord[]) ?? [];

  const progressAll =
    useLiveQuery(async () => {
      const db = getDB();
      if (!db) return {} as Record<string, Record<string, { attemptsUsed: number; score: number; totalPoints: number; completed: boolean }>>;
      const records = await db.assignmentProgress.toArray();
      const out: Record<string, Record<string, { attemptsUsed: number; score: number; totalPoints: number; completed: boolean }>> = {};
      for (const r of records) {
        out[r.assignmentId] = out[r.assignmentId] ?? {};
        out[r.assignmentId][r.itemId] = {
          attemptsUsed: r.attemptsUsed,
          score: r.score,
          totalPoints: r.totalPoints,
          completed: r.completed,
        };
      }
      return out;
    }, [], {} as Record<string, Record<string, { attemptsUsed: number; score: number; totalPoints: number; completed: boolean }>>) ?? {};

  const [showImport, setShowImport] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [importError, setImportError] = useState("");
  const [importOk, setImportOk] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const imported = assignments.filter((a) => a.role === "imported");
  const created = assignments.filter((a) => a.role === "created");
  const byId = useMemo(() => new Map(items.map((m) => [m.id, m])), [items]);

  const doImport = async (text: string) => {
    setImportError("");
    setImportOk("");
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      setImportError("不是合法的 JSON 文件");
      return;
    }
    const parsed = AssignmentFileSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("；");
      setImportError(`布置文件格式不正确 → ${issues}`);
      return;
    }
    const file = parsed.data;
    const db = getDB();
    if (!db) return;
    const now = Date.now();
    const assignmentId = file.assignmentId ?? `cx-assignment:${crypto.randomUUID()}`;
    // 教师自导入测试（同 ID 已存在 created 记录）时保留 created 身份，
    // 避免「我布置的」卡片被覆盖消失；学生机器上无记录 → 照常 imported
    const existing = await db.assignments.get(assignmentId);
    await db.assignments.put({
      assignmentId,
      role: existing?.role === "created" ? "created" : "imported",
      title: file.title,
      teacherName: file.teacherName,
      description: file.description,
      dueDate: file.dueDate,
      items: file.items,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    setPasteText("");
    setImportOk(`已导入《${file.title}》（${file.items.length} 项内容）`);
    setShowImport(false);
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => void doImport(String(reader.result));
    reader.readAsText(file);
  };

  const removeAssignment = async (assignmentId: string) => {
    const db = getDB();
    if (!db) return;
    await db.assignments.delete(assignmentId);
    const progress = await db.assignmentProgress.where("assignmentId").equals(assignmentId).toArray();
    await db.assignmentProgress.bulkDelete(progress.map((p) => [p.assignmentId, p.itemId] as [string, string]));
  };

  const copyTextReport = async (a: AssignmentRecord) => {
    const report = buildReport(a, progressAll[a.assignmentId] ?? {}, "学生");
    await navigator.clipboard?.writeText(reportToText(report));
    setImportOk("文本报告已复制到剪贴板，可直接发给老师");
  };

  const renderAssignmentCard = (a: AssignmentRecord, isTeacher: boolean) => {
    const progress = progressAll[a.assignmentId] ?? {};
    const done = a.items.filter((i) => progress[i.itemId]?.completed).length;
    const total = a.items.length;
    const score = a.items.reduce((s, i) => s + (progress[i.itemId]?.score ?? 0), 0);
    const totalPoints = a.items.reduce((s, i) => s + i.points, 0);
    const overdue = a.dueDate ? new Date(a.dueDate) < new Date(new Date().toDateString()) : false;
    const isOpen = expanded === a.assignmentId;

    return (
      <div key={a.assignmentId} className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold">{a.title || "未命名作业"}</h3>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                  overdue
                    ? "bg-rose-50 text-rose-700 ring-rose-200"
                    : "bg-slate-100 text-slate-600 ring-slate-200"
                )}
              >
                <CalendarClock className="mr-1 -mt-0.5 inline h-3 w-3" />
                {a.dueDate ? (overdue ? `已逾期（${a.dueDate}）` : `截止 ${a.dueDate}`) : "无截止"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {a.teacherName && <span>老师：{a.teacherName} · </span>}
              {total} 项内容
              {!isTeacher && totalPoints > 0 && (
                <>
                  {" "}
                  · 完成 {done}/{total} · 得分 {score}/{totalPoints}
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {a.items[0] && !isTeacher && (
              <Link
                href={`/library/items/${a.items[0].itemId}/?a=${encodeURIComponent(a.assignmentId)}`}
                className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                {done > 0 ? "继续学习" : "开始学习"}
              </Link>
            )}
            {!isTeacher && (
              <>
                <button
                  type="button"
                  onClick={() => downloadJson(buildReport(a, progress, "学生"), `report-${a.title || "assignment"}.json`)}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
                >
                  <FileDown className="h-4 w-4" />
                  报告 JSON
                </button>
                <button
                  type="button"
                  onClick={() => void copyTextReport(a)}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
                >
                  <Copy className="h-4 w-4" />
                  复制文本报告
                </button>
              </>
            )}
            {isTeacher && (
              <>
                {a.items[0] && (
                  <Link
                    href={`/library/items/${a.items[0].itemId}/?a=${encodeURIComponent(a.assignmentId)}`}
                    className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                  >
                    开始学习
                  </Link>
                )}
                <Link
                  href={`/assignments/new/?id=${encodeURIComponent(a.assignmentId)}`}
                  className="rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
                >
                  编辑
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    downloadJson(
                      {
                        format: "openlab-assignment",
                        version: 1,
                        assignmentId: a.assignmentId,
                        title: a.title,
                        teacherName: a.teacherName,
                        description: a.description,
                        dueDate: a.dueDate,
                        items: a.items,
                      },
                      `${(a.title || "assignment").replace(/[\\/:*?"<>|]/g, "_")}.json`
                    );
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
                >
                  <FileDown className="h-4 w-4" />
                  重新导出
                </button>
              </>
            )}
            <button
              type="button"
              title="删除"
              onClick={() => void removeAssignment(a.assignmentId)}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : a.assignmentId)}
              title={isOpen ? "收起明细" : "展开明细"}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100"
            >
              <ChevronDown className={cn("h-4 w-4 transition", isOpen && "rotate-180")} />
            </button>
          </div>
        </div>

        {/* 进度条（学生） */}
        {!isTeacher && total > 0 && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${Math.round((done / total) * 100)}%` }}
            />
          </div>
        )}

        {/* 明细表 */}
        {isOpen && (
          <ul className="mt-4 divide-y divide-slate-100 border-t pt-2">
            {a.items.map((it, idx) => {
              const p = progress[it.itemId];
              const meta = byId.get(it.itemId);
              const title = it.title ?? meta?.title ?? it.itemId;
              return (
                <li key={it.itemId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                  <span className="w-5 text-xs font-bold text-slate-400">{idx + 1}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {meta ? (
                      <Link href={`/library/items/${it.itemId}/?a=${encodeURIComponent(a.assignmentId)}`} className="transition hover:text-brand-700">
                        {title}
                      </Link>
                    ) : (
                      title
                    )}
                  </span>
                  <span className="text-xs text-slate-400">
                    {p ? `${p.score}/${p.totalPoints || it.points} 分 · 尝试 ${p.attemptsUsed} 次` : "未开始"}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs ring-1 ring-inset",
                      p?.completed
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : p
                          ? "bg-amber-50 text-amber-700 ring-amber-200"
                          : "bg-slate-50 text-slate-500 ring-slate-200"
                    )}
                  >
                    {p?.completed ? "已完成" : p ? "进行中" : "未开始"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">作业中心</h1>
          <p className="mt-2 max-w-xl text-slate-500">
            老师导出布置文件发给你，导入后即可在作业模式下学习（自动计分、限次）；完成后导出报告回传。全程无需账号。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowImport((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <Upload className="h-4 w-4" />
            导入布置文件
          </button>
          <Link
            href="/assignments/new"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
          >
            <FilePlus2 className="h-4 w-4" />
            我要布置作业
          </Link>
        </div>
      </header>

      {/* 导入面板 */}
      {showImport && (
        <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50/40 p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-brand-900">
            <FileJson className="h-4 w-4" />
            导入老师发来的布置文件（assignment.json）
          </h2>
          <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-brand-300 bg-white px-4 py-6 text-sm text-slate-500 transition hover:border-brand-400">
            <Upload className="h-4 w-4" />
            点击选择 JSON 文件
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
          </label>
          <p className="mt-3 text-center text-xs text-slate-400">— 或直接粘贴文件内容 —</p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={4}
            placeholder='{"format":"openlab-assignment", ...}'
            className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-xs outline-none focus:border-brand-400"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void doImport(pasteText)}
              disabled={!pasteText.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40"
            >
              导入
            </button>
            {importError && <span className="text-sm text-rose-600">{importError}</span>}
            {importOk && <span className="text-sm text-emerald-600">{importOk}</span>}
          </div>
        </div>
      )}
      {!showImport && importOk && <p className="mt-4 text-sm text-emerald-600">{importOk}</p>}

      {/* 我的作业（学生） */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <ClipboardList className="h-5 w-5 text-brand-600" />
          我的作业
        </h2>
        {imported.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 rounded-2xl border border-dashed p-6 text-sm text-slate-400">
            <Inbox className="h-4 w-4" />
            还没有作业——点右上角「导入布置文件」，选择老师发的 assignment.json
          </p>
        ) : (
          <div className="mt-4 space-y-4">{imported.map((a) => renderAssignmentCard(a, false))}</div>
        )}
      </section>

      {/* 我布置的（教师） */}
      <section className="mt-12">
        <h2 className="text-lg font-bold">我布置的作业</h2>
        {created.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed p-6 text-center text-sm text-slate-400">
            还没有创建过作业——
            <Link href="/assignments/new" className="text-brand-700 hover:underline">
              去组卷
            </Link>
          </p>
        ) : (
          <div className="mt-4 space-y-4">{created.map((a) => renderAssignmentCard(a, true))}</div>
        )}
      </section>
    </div>
  );
}
