import type { Metadata } from "next";
import { getPublishedItems } from "@/lib/content/repository";
import { AssignmentHub } from "@/components/assignments/assignment-hub";

export const metadata: Metadata = {
  title: "作业中心",
  description: "导入老师布置的作业文件，在作业模式下学习并导出进度报告；教师可从资料库组卷并导出布置文件。全程无需账号。",
};

export default function AssignmentsPage() {
  const items = getPublishedItems().map((i) => i.meta);
  return <AssignmentHub items={items} />;
}
