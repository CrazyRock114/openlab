import type { Metadata } from "next";
import { getPublishedItems, getPathways } from "@/lib/content/repository";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const metadata: Metadata = {
  title: "我的学习",
  description: "查看学习进度、收藏的资源与我的路径草稿（数据保存在本机浏览器）。",
  robots: { index: false },
};

export default function DashboardPage() {
  const items = getPublishedItems().map((i) => i.meta);
  const pathways = getPathways().map((p) => ({
    id: p.id,
    title: p.title,
    entryItemIds: p.entries.map((e) => e.itemId),
  }));
  return <DashboardClient items={items} pathways={pathways} />;
}
