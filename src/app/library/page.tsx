import type { Metadata } from "next";
import { getPublishedItems } from "@/lib/content/repository";
import { LibraryBrowser } from "@/components/library/library-browser";

export const metadata: Metadata = {
  title: "资料库",
  description:
    "浏览全部免费科学学习资源：虚拟模拟实验、视频、互动测验与图文课程，按类型与背景知识门槛筛选。",
};

export default function LibraryPage() {
  const items = getPublishedItems().map((i) => i.meta);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">资料库</h1>
        <p className="mt-2 text-slate-500">
          共 {items.length} 个免费资源 · 全部无需账号即可学习
        </p>
      </header>
      <div className="mt-8">
        <LibraryBrowser items={items} />
      </div>
    </div>
  );
}
