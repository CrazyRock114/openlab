"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BookmarkCheck, BookmarkPlus, CheckCircle2, Circle } from "lucide-react";
import { getDB, setItemCompleted, toggleFavorite } from "@/lib/db";
import { useAssignmentMode } from "@/components/assignments/assignment-mode";
import { cn } from "@/lib/utils";

/** 标记完成按钮：写入 IndexedDB（M2），作业模式下同时上报完成（M3） */
export function CompleteButton({ itemId }: { itemId: string }) {
  const completed =
    useLiveQuery(async () => (await getDB()?.progress.get(itemId))?.completed ?? false, [itemId], false) ?? false;
  const assignment = useAssignmentMode();

  return (
    <button
      type="button"
      onClick={() => {
        void setItemCompleted(itemId, !completed);
        if (assignment.active) assignment.reportCompletion(!completed);
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition",
        completed
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
      )}
    >
      {completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      {completed ? "已完成" : "标记完成"}
    </button>
  );
}

/** 收藏按钮：icon-only（卡片）与带文案（详情页）两种形态 */
export function FavoriteButton({
  itemId,
  labeled = false,
  className,
}: {
  itemId: string;
  labeled?: boolean;
  className?: string;
}) {
  const favorited =
    useLiveQuery(async () => (await getDB()?.favorites.get(itemId)) !== undefined, [itemId], false) ?? false;

  return (
    <button
      type="button"
      title={favorited ? "取消收藏" : "收藏"}
      onClick={() => void toggleFavorite(itemId)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition",
        favorited
          ? "border-amber-300 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:text-amber-700",
        !labeled && "px-2.5 py-1.5",
        className
      )}
    >
      {favorited ? <BookmarkCheck className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
      {labeled && (favorited ? "已收藏" : "收藏")}
    </button>
  );
}

/** 我的笔记：每个资源一条，存 IndexedDB */
export function NoteEditor({ itemId }: { itemId: string }) {
  const saved = useLiveQuery(async () => (await getDB()?.notes.get(itemId))?.body ?? "", [itemId], undefined);
  const [value, setValue] = useState("");
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (saved !== undefined && !dirty) setValue(saved);
  }, [saved, dirty]);

  const save = async () => {
    const db = getDB();
    if (!db) return;
    const body = value.trim();
    if (body) await db.notes.put({ itemId, body, updatedAt: Date.now() });
    else await db.notes.delete(itemId);
    setDirty(false);
    setSavedAt(Date.now());
  };

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
        }}
        rows={4}
        placeholder="写下你的理解、疑问或老师布置的思考…"
        className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      />
      <div className="mt-2 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty}
          className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40"
        >
          保存笔记
        </button>
        <span className="text-xs text-slate-400">
          {savedAt ? `已保存 ${new Date(savedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}` : "仅保存在本机"}
        </span>
      </div>
    </div>
  );
}
