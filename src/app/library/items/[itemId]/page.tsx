import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GraduationCap, Route } from "lucide-react";
import {
  getItem,
  getPathwayContaining,
  getPublishedItems,
} from "@/lib/content/repository";
import { SUBJECT_AREAS } from "@/lib/content/schema";
import {
  BG_LABELS,
  LICENSE_LABELS,
  LICENSE_URLS,
  typeLabel,
} from "@/lib/content/labels";
import { ItemPlayer } from "@/components/content/item-player";
import { BackgroundChip, TypeBadge } from "@/components/content/item-card";
import { CompleteButton, FavoriteButton, NoteEditor } from "@/components/progress/learning-widgets";
import { AddToDraftButton } from "@/components/pathway/pathway-widgets";
import { AssignmentBanner, AssignmentModeProvider } from "@/components/assignments/assignment-mode";
import { CopyLinkButton } from "@/components/content/copy-link-button";
import { safeDecode } from "@/lib/utils";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedItems().map((i) => ({ itemId: i.meta.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ itemId: string }>;
}): Promise<Metadata> {
  const { itemId: encoded } = await params;
  const item = getItem(safeDecode(encoded));
  if (!item) return {};
  return {
    title: item.meta.title,
    description: item.meta.description || `${typeLabel(item.meta.type)}：${item.meta.title}`,
    openGraph: { title: item.meta.title, type: "article" },
  };
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId: encoded } = await params;
  const itemId = safeDecode(encoded);
  const item = getItem(itemId);
  if (!item || item.meta.status !== "published") notFound();

  const meta = item.meta;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const inPathway = getPathwayContaining(meta.id);
  const licenseUrl = LICENSE_URLS[meta.license];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: meta.title,
    description: meta.description,
    learningResourceType: typeLabel(meta.type),
    isAccessibleForFree: true,
    inLanguage: "zh-CN",
    timeRequired: `PT${meta.durationMinutes}M`,
    teaches: meta.learningObjectives,
    keywords: meta.tags.join("、"),
    license: licenseUrl,
    author: meta.authors.map((a) => ({ "@type": "Person", name: a.name })),
    publisher: { "@type": "Organization", name: "OpenLab" },
    url: `${siteUrl}/library/items/${meta.id}`,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" />
        返回资料库
      </Link>

      <div className="mt-4 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0" data-pagefind-body>
          <AssignmentModeProvider itemId={meta.id}>
            <AssignmentBanner />
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{meta.title}</h1>
            {meta.description && <p className="mt-2 leading-relaxed text-slate-500">{meta.description}</p>}

            <div className="mt-5">
              <ItemPlayer item={item} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2.5" data-pagefind-ignore>
              <CompleteButton itemId={meta.id} />
              <FavoriteButton itemId={meta.id} labeled />
              <CopyLinkButton />
              {inPathway && (
                <Link
                  href={`/library/pathway/${inPathway.id}/item/${meta.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
                >
                  <Route className="h-4 w-4" />
                  在路径中学习：{inPathway.title}
                </Link>
              )}
            </div>
          </AssignmentModeProvider>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={meta.type} />
              <BackgroundChip level={meta.backgroundKnowledge} />
            </div>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">学科</dt>
                <dd className="text-right font-medium">
                  {SUBJECT_AREAS[meta.subjectArea] ?? meta.subjectArea}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">预计时长</dt>
                <dd className="font-medium">{meta.durationMinutes} 分钟</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">许可</dt>
                <dd className="text-right font-medium">
                  {licenseUrl ? (
                    <a
                      href={licenseUrl}
                      target="_blank"
                      rel="license noreferrer"
                      className="text-brand-700 hover:underline"
                    >
                      {LICENSE_LABELS[meta.license]}
                    </a>
                  ) : (
                    LICENSE_LABELS[meta.license]
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {meta.learningObjectives.length > 0 && (
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                <GraduationCap className="h-4 w-4 text-brand-600" />
                学习目标
              </h2>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
                {meta.learningObjectives.map((o) => (
                  <li key={o} className="flex gap-2">
                    <span className="mt-0.5 text-brand-500">•</span>
                    {o}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {meta.tags.length > 0 && (
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold">标签</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {meta.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold">作者与来源</h2>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
              {meta.authors.map((a) => a.name).join("、")}
              <span className="text-slate-400"> · 来自「{meta.organization}」</span>
            </p>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold">我的笔记</h2>
            <div className="mt-3">
              <NoteEditor itemId={meta.id} />
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold">添加到草稿路径</h2>
            <div className="mt-3">
              <AddToDraftButton itemId={meta.id} />
            </div>
          </section>
        </aside>
      </div>

      <script
        type="application/ld+json"
        // < 转义为 \u003c：防止内容字段含 </script> 时提前闭合标签（疫苗：内容字段理论可信但仍加固）
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}
