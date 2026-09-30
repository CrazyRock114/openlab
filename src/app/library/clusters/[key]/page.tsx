import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, Layers, Route } from "lucide-react";
import { getCluster, getClusters, getPathway } from "@/lib/content/repository";
import { safeDecode } from "@/lib/utils";

export const dynamicParams = false;

export function generateStaticParams() {
  return getClusters().map((c) => ({ key: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key: encoded } = await params;
  const cluster = getCluster(safeDecode(encoded));
  if (!cluster) return {};
  return { title: cluster.title, description: cluster.description };
}

export default async function ClusterPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key: encoded } = await params;
  const cluster = getCluster(safeDecode(encoded));
  if (!cluster) notFound();

  const pathways = cluster.pathways.map((id) => getPathway(id)).filter((p) => p !== undefined);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/library/pathways" className="transition hover:text-brand-700">
          学习路径
        </Link>
        <span>/</span>
        <span>群集</span>
      </div>

      <div className="mt-6 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md">
          <Layers className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{cluster.title}</h1>
          {cluster.description && (
            <p className="mt-2 max-w-2xl leading-relaxed text-slate-500">{cluster.description}</p>
          )}
          {cluster.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {cluster.tags.map((t) => (
                <span key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-9 space-y-4">
        <h2 className="text-sm font-semibold text-slate-400">包含 {pathways.length} 条学习路径</h2>
        {pathways.map((p) => (
          <Link
            key={p.id}
            href={`/library/pathway/${p.id}`}
            className="group flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-brand-600 text-white">
              <Route className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold transition group-hover:text-brand-700">{p.title}</h3>
              <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{p.description}</p>
              <p className="mt-1 text-xs text-slate-400">{p.entries.length} 个条目</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
          </Link>
        ))}
      </div>

      <Link
        href="/library/pathways"
        className="mt-8 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" />
        浏览全部路径
      </Link>
    </div>
  );
}
