import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, GraduationCap, Route } from "lucide-react";
import { getItem, getPathway, getPathways } from "@/lib/content/repository";
import { LICENSE_LABELS, typeIcon, typeLabel } from "@/lib/content/labels";
import { safeDecode } from "@/lib/utils";
import { ClonePathwayButton, CompleteDot, PathwayProgress } from "@/components/pathway/pathway-widgets";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPathways().map((p) => ({ key: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key: encoded } = await params;
  const pathway = getPathway(safeDecode(encoded));
  if (!pathway) return {};
  return { title: pathway.title, description: pathway.description };
}

export default async function PathwayPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key: encoded } = await params;
  const pathway = getPathway(safeDecode(encoded));
  if (!pathway) notFound();

  const entries = pathway.entries.map((e) => {
    const item = getItem(e.itemId);
    if (!item) notFound();
    return { ...e, item };
  });
  const totalMinutes = entries.reduce((s, e) => s + e.item.meta.durationMinutes, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/library" className="transition hover:text-brand-700">
          资料库
        </Link>
        <span>/</span>
        <Link href="/library/pathways" className="transition hover:text-brand-700">
          学习路径
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border bg-white shadow-sm">
        {/* 头部 */}
        <div className="bg-gradient-to-br from-indigo-600 via-brand-600 to-violet-600 px-6 py-8 text-white sm:px-9">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <Route className="h-3.5 w-3.5" />
            学习路径
          </span>
          <h1 className="mt-3.5 text-2xl font-bold sm:text-3xl">{pathway.title}</h1>
          {pathway.description && (
            <p className="mt-2.5 max-w-2xl leading-relaxed text-brand-100">{pathway.description}</p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-brand-100">
            <span>{entries.length} 个条目</span>
            <span>预计 {totalMinutes} 分钟</span>
            <span>{LICENSE_LABELS[pathway.license]}</span>
            <span>作者：{pathway.authors.map((a) => a.name).join("、")}</span>
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-5">
            <PathwayProgress itemIds={pathway.entries.map((e) => e.itemId)} />
            <ClonePathwayButton
              source={{
                id: pathway.id,
                title: pathway.title,
                description: pathway.description,
                learningObjectives: pathway.learningObjectives,
                language: pathway.language,
                license: pathway.license,
                authors: pathway.authors,
                entries: pathway.entries,
              }}
            />
          </div>
        </div>

        {/* 学习目标 */}
        {pathway.learningObjectives.length > 0 && (
          <div className="border-b bg-brand-50/60 px-6 py-5 sm:px-9">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-brand-900">
              <GraduationCap className="h-4 w-4" />
              学习目标
            </h2>
            <ul className="mt-2.5 grid gap-1.5 text-sm text-brand-900/80 sm:grid-cols-2">
              {pathway.learningObjectives.map((o) => (
                <li key={o} className="flex gap-2">
                  <span className="text-brand-400">•</span>
                  {o}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 目录 */}
        <ol className="divide-y divide-slate-100">
          {entries.map((e, idx) => {
            const Icon = typeIcon(e.item.meta.type);
            return (
              <li key={e.itemId} className="px-6 py-5 sm:px-9">
                <div className="flex items-center gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                    {idx + 1}
                  </span>
                  <CompleteDot itemId={e.itemId} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/library/pathway/${pathway.id}/item/${e.itemId}`}
                      className="group flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate font-medium transition group-hover:text-brand-700">
                        {e.item.meta.title}
                      </span>
                      <span className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 sm:inline">
                        {typeLabel(e.item.meta.type)}
                      </span>
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {e.item.meta.durationMinutes} 分钟
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </div>

                {e.educatorNotes && (
                  <div className="ml-[52px] mt-3 rounded-xl bg-amber-50 p-3.5 text-sm text-amber-900 ring-1 ring-amber-200/70 sm:ml-[84px]">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <GraduationCap className="h-4 w-4" />
                      教师备注
                    </span>
                    <p className="mt-1 leading-relaxed">{e.educatorNotes}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <Link
        href="/library/pathways"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" />
        浏览全部路径
      </Link>
    </div>
  );
}
