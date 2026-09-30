import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, GraduationCap, Route } from "lucide-react";
import { getItem, getPathway, getPathways } from "@/lib/content/repository";
import { ItemPlayer } from "@/components/content/item-player";
import { CompleteButton } from "@/components/progress/learning-widgets";
import { PathwayProgress } from "@/components/pathway/pathway-widgets";
import { safeDecode } from "@/lib/utils";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPathways().flatMap((p) => p.entries.map((e) => ({ key: p.id, itemId: e.itemId })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string; itemId: string }>;
}): Promise<Metadata> {
  const { key: rawKey, itemId: rawItemId } = await params;
  const pathway = getPathway(safeDecode(rawKey));
  const item = getItem(safeDecode(rawItemId));
  if (!pathway || !item) return {};
  return { title: `${item.meta.title} · ${pathway.title}`, robots: { index: false } };
}

export default async function PathwayItemPage({
  params,
}: {
  params: Promise<{ key: string; itemId: string }>;
}) {
  const { key: rawKey, itemId: rawItemId } = await params;
  const key = safeDecode(rawKey);
  const itemId = safeDecode(rawItemId);

  const pathway = getPathway(key);
  if (!pathway) notFound();
  const idx = pathway.entries.findIndex((e) => e.itemId === itemId);
  if (idx < 0) notFound();
  const item = getItem(itemId);
  if (!item) notFound();

  const prev = pathway.entries[idx - 1];
  const next = pathway.entries[idx + 1];
  const entry = pathway.entries[idx];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* 路径上下文头 */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-brand-600 to-violet-600 text-white shadow-sm">
        <div className="px-5 py-6 sm:px-8">
          <div className="flex flex-wrap items-center gap-2 text-sm text-brand-100">
            <Route className="h-4 w-4" />
            <Link href={`/library/pathway/${pathway.id}`} className="transition hover:text-white">
              {pathway.title}
            </Link>
            <span>/</span>
            <span>
              第 {idx + 1} / {pathway.entries.length} 步
            </span>
          </div>
          <div className="mt-4">
            <PathwayProgress itemIds={pathway.entries.map((e) => e.itemId)} />
          </div>
        </div>
      </div>

      {/* 当前条目 */}
      <div className="mt-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{item.meta.title}</h1>
        {entry.educatorNotes && (
          <div className="mt-3 rounded-xl bg-amber-50 p-3.5 text-sm text-amber-900 ring-1 ring-amber-200/70">
            <span className="flex items-center gap-1.5 font-semibold">
              <GraduationCap className="h-4 w-4" />
              教师备注
            </span>
            <p className="mt-1 leading-relaxed">{entry.educatorNotes}</p>
          </div>
        )}
        <div className="mt-5">
          <ItemPlayer item={item} />
        </div>
        <div className="mt-4">
          <CompleteButton itemId={itemId} />
        </div>
      </div>

      {/* 上一步 / 下一步 */}
      <nav className="mt-10 grid gap-3 border-t pt-6 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/library/pathway/${pathway.id}/item/${prev.itemId}`}
            className="group rounded-2xl border bg-white p-4 transition hover:border-brand-300 hover:shadow-md"
          >
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <ArrowLeft className="h-3.5 w-3.5" />
              上一步
            </span>
            <span className="mt-1 block font-medium transition group-hover:text-brand-700">
              {getItem(prev.itemId)?.meta.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/library/pathway/${pathway.id}/item/${next.itemId}`}
            className="group rounded-2xl border bg-white p-4 text-right transition hover:border-brand-300 hover:shadow-md"
          >
            <span className="flex items-center justify-end gap-1.5 text-xs text-slate-400">
              下一步
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
            <span className="mt-1 block font-medium transition group-hover:text-brand-700">
              {getItem(next.itemId)?.meta.title}
            </span>
          </Link>
        ) : (
          <Link
            href={`/library/pathway/${pathway.id}`}
            className="group rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-right transition hover:shadow-md"
          >
            <span className="flex items-center justify-end gap-1.5 text-xs text-emerald-600">
              已是最后一步
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
            <span className="mt-1 block font-medium text-emerald-700">回到路径总览</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
