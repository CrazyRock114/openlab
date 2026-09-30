"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, CheckCircle2, Circle, Copy, FolderPlus, Loader2 } from "lucide-react";
import {
  clonePathwayToDraft,
  getDB,
  newDraftId,
  type DraftPathwayRecord,
} from "@/lib/db";
import { cn } from "@/lib/utils";

/** 路径学习进度条：已完成条目 / 总条目 */
export function PathwayProgress({ itemIds }: { itemIds: string[] }) {
  const progressMap = useLiveQuery(async () => {
    const db = getDB();
    if (!db) return {};
    const records = await db.progress.toArray();
    return Object.fromEntries(records.map((r) => [r.itemId, r.completed]));
  }, [], {} as Record<string, boolean>);

  const done = itemIds.filter((id) => progressMap?.[id]).length;
  const total = itemIds.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="min-w-48">
      <div className="flex items-center justify-between text-xs text-brand-100">
        <span>
          已完成 {done}/{total}
        </span>
        <span>{percent}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/25">
        <div
          className="h-full rounded-full bg-white transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/** 条目完成状态小圆点 */
export function CompleteDot({ itemId }: { itemId: string }) {
  const completed =
    useLiveQuery(async () => (await getDB()?.progress.get(itemId))?.completed ?? false, [itemId], false) ?? false;
  return completed ? (
    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-label="已完成" />
  ) : (
    <Circle className="h-5 w-5 shrink-0 text-slate-300" aria-label="未完成" />
  );
}

/** 克隆并编辑（Remix）：公共路径 → 本机草稿 → 编辑器 */
export function ClonePathwayButton({
  source,
  className,
}: {
  source: {
    id: string;
    title: string;
    description: string;
    learningObjectives: string[];
    language: string;
    license: string;
    authors: { name: string }[];
    entries: { itemId: string; educatorNotes?: string }[];
  };
  className?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "cloning">("idle");

  return (
    <button
      type="button"
      disabled={state === "cloning"}
      onClick={async () => {
        setState("cloning");
        try {
          const draftId = await clonePathwayToDraft(source);
          router.push(`/library/pathway/edit/?id=${encodeURIComponent(draftId)}`);
        } catch {
          setState("idle");
        }
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/25 disabled:opacity-60",
        className
      )}
    >
      {state === "cloning" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
      克隆并编辑（Remix）
    </button>
  );
}

/** 把当前资源添加到某个草稿路径（LabXchange「Add to draft pathway」） */
export function AddToDraftButton({ itemId }: { itemId: string }) {
  const drafts =
    useLiveQuery(async () => {
      const db = getDB();
      if (!db) return [] as DraftPathwayRecord[];
      const all = await db.drafts.toArray();
      return all.sort((a, b) => b.updatedAt - a.updatedAt);
    }, [], [] as DraftPathwayRecord[]) ?? [];
  const [draftId, setDraftId] = useState("");
  const [status, setStatus] = useState<"idle" | "added" | "empty">("idle");

  useEffect(() => {
    if (drafts.length > 0 && !drafts.some((d) => d.draftId === draftId)) setDraftId(drafts[0].draftId);
  }, [drafts, draftId]);

  const add = async () => {
    const db = getDB();
    if (!db) return;
    if (drafts.length === 0) {
      // 没有草稿时：快速创建一个并加入
      const now = Date.now();
      const id = newDraftId();
      await db.drafts.put({
        draftId: id,
        title: "我的学习路径",
        description: "",
        learningObjectives: [],
        language: "zh-hans",
        license: "CC_BY_4",
        authorName: "本机创作者",
        entries: [{ itemId }],
        createdAt: now,
        updatedAt: now,
      });
      setDraftId(id);
      setStatus("added");
      return;
    }
    const target = draftId || drafts[0].draftId;
    const draft = await db.drafts.get(target);
    if (!draft) return;
    if (draft.entries.some((e) => e.itemId === itemId)) {
      setStatus("added");
      return;
    }
    await db.drafts.update(target, { entries: [...draft.entries, { itemId }], updatedAt: Date.now() });
    setStatus("added");
  };

  if (drafts.length === 0) {
    return (
      <button
        type="button"
        onClick={() => void add()}
        className="inline-flex w-full items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
      >
        <FolderPlus className="h-4 w-4" />
        新建草稿路径并加入
      </button>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <select
          value={draftId}
          onChange={(e) => {
            setDraftId(e.target.value);
            setStatus("idle");
          }}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-600 outline-none focus:border-brand-400"
        >
          {drafts.map((d) => (
            <option key={d.draftId} value={d.draftId}>
              {d.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void add()}
          className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
        >
          添加
        </button>
      </div>
      {status === "added" && (
        <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-emerald-600">
          <Check className="h-3.5 w-3.5" />
          已加入草稿路径
        </p>
      )}
    </div>
  );
}
