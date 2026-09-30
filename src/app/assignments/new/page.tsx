import type { Metadata } from "next";
import { getItemQuiz, getPublishedItems } from "@/lib/content/repository";
import { AssignmentEditor } from "@/components/assignments/assignment-editor";

export const metadata: Metadata = {
  title: "布置作业",
  description: "从资料库挑选内容、设置分值与每题尝试次数，导出布置文件发给学生。",
  robots: { index: false },
};

export default function AssignmentNewPage() {
  const published = getPublishedItems();
  const items = published.map((i) => i.meta);
  // 问题集默认分值 = 题库内部总分（教师可改）
  const quizTotals: Record<string, number> = {};
  for (const item of published) {
    if (item.meta.type === "assignment") {
      const quiz = getItemQuiz(item);
      if (quiz) {
        quizTotals[item.meta.id] = quiz.questions.reduce((s, q) => s + q.points, 0);
      }
    }
  }
  return <AssignmentEditor items={items} quizTotals={quizTotals} />;
}
