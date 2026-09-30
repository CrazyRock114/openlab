/** 草稿路径 → 可分享/可贡献的 JSON 文件（不含本机元数据） */
import type { DraftPathwayRecord } from "@/lib/db";

export function draftToPathwayJson(draft: DraftPathwayRecord) {
  return {
    title: draft.title,
    description: draft.description,
    learningObjectives: draft.learningObjectives,
    language: draft.language,
    license: draft.license,
    authors: [{ name: draft.authorName || "本机创作者" }],
    entries: draft.entries.map((e) => {
      const out: { itemId: string; educatorNotes?: string } = { itemId: e.itemId };
      if (e.educatorNotes) out.educatorNotes = e.educatorNotes;
      return out;
    }),
  };
}

export function downloadDraftJson(draft: DraftPathwayRecord): void {
  const json = JSON.stringify(draftToPathwayJson(draft), null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(draft.title || "pathway").replace(/[\\/:*?"<>|]/g, "_")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
