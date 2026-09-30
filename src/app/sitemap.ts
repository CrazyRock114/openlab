import type { MetadataRoute } from "next";
import { getClusters, getPathways, getPublishedItems } from "@/lib/content/repository";

export const dynamic = "force-static";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entry = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${siteUrl}${path === "/" ? "" : path}/`,
    lastModified: now,
    changeFrequency: "weekly",
    priority,
  });

  return [
    entry("/", 1),
    entry("/library", 0.9),
    entry("/library/pathways", 0.8),
    ...getPublishedItems().map((i) => entry(`/library/items/${i.meta.id}`, 0.8)),
    ...getPathways().map((p) => entry(`/library/pathway/${p.id}`, 0.7)),
    ...getClusters().map((c) => entry(`/library/clusters/${c.id}`, 0.6)),
  ];
}
