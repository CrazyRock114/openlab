import type { Metadata } from "next";
import { getPublishedItems } from "@/lib/content/repository";
import { PathwayEditor } from "@/components/pathway/pathway-editor";

export const metadata: Metadata = {
  title: "路径编辑器",
  description: "创建或编辑你的学习路径草稿：从资料库挑选条目、编排顺序、添加学习目标与教师备注，自动保存在本机。",
  robots: { index: false },
};

export default function PathwayEditPage() {
  const items = getPublishedItems().map((i) => i.meta);
  return <PathwayEditor items={items} />;
}
