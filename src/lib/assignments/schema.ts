import { z } from "zod";

/**
 * 布置码（Assignment）共享文件格式 —— M3「无后端教学闭环」的核心：
 * 教师导出 assignment.json → 学生导入 → 作业模式学习 → 导出进度报告回传。
 * 文件即传输介质，无需账号与服务器。
 */

export const AssignmentFileSchema = z.object({
  format: z.literal("openlab-assignment"),
  version: z.literal(1),
  /** 布置标识：重复导入同一份时视为更新而非新建 */
  assignmentId: z
    .string()
    .regex(/^cx-assignment:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    .optional(),
  title: z.string().min(1, "作业标题不能为空"),
  teacherName: z.string().min(1, "教师名不能为空"),
  description: z.string().default(""),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "截止日期需为 YYYY-MM-DD").optional(),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        /** 冗余标题：脱离本站内容库时仍可展示 */
        title: z.string().optional(),
        /** 每题最大尝试次数；null = 不限 */
        maxAttempts: z.number().int().positive().nullable().default(null),
        points: z.number().int().positive().default(10),
      })
    )
    .min(1, "作业至少包含一个资源"),
});

export type AssignmentFile = z.infer<typeof AssignmentFileSchema>;

/** 学生进度报告（回传给教师的文件格式） */
export interface AssignmentReportItem {
  itemId: string;
  title: string;
  status: "未开始" | "进行中" | "已完成";
  score: number;
  totalPoints: number;
  attemptsUsed: number;
}

export interface AssignmentReport {
  format: "openlab-assignment-report";
  version: 1;
  assignmentTitle: string;
  teacherName: string;
  studentName: string;
  generatedAt: string;
  dueDate?: string;
  items: AssignmentReportItem[];
  totalScore: number;
  totalPoints: number;
}

export function buildReport(
  file: { title: string; teacherName: string; dueDate?: string; items: { itemId: string; title?: string; points: number }[] },
  progress: Record<string, { attemptsUsed: number; score: number; totalPoints: number; completed: boolean }>,
  studentName: string
): AssignmentReport {
  const items: AssignmentReportItem[] = file.items.map((it) => {
    const p = progress[it.itemId];
    const totalPoints = it.points;
    const score = p?.score ?? 0;
    return {
      itemId: it.itemId,
      title: it.title ?? it.itemId,
      status: p?.completed ? "已完成" : p ? "进行中" : "未开始",
      score,
      totalPoints,
      attemptsUsed: p?.attemptsUsed ?? 0,
    };
  });
  return {
    format: "openlab-assignment-report",
    version: 1,
    assignmentTitle: file.title,
    teacherName: file.teacherName,
    studentName,
    generatedAt: new Date().toISOString(),
    dueDate: file.dueDate,
    items,
    totalScore: items.reduce((s, i) => s + i.score, 0),
    totalPoints: items.reduce((s, i) => s + i.totalPoints, 0),
  };
}

export function reportToText(report: AssignmentReport): string {
  const lines = [
    `《${report.assignmentTitle}》学习报告`,
    `学生：${report.studentName}`,
    report.dueDate ? `截止：${report.dueDate}` : null,
    `生成时间：${new Date(report.generatedAt).toLocaleString("zh-CN")}`,
    "",
    ...report.items.map(
      (i) =>
        `${i.status === "已完成" ? "✅" : i.status === "进行中" ? "🔄" : "⬜"} ${i.title} — ${i.score}/${i.totalPoints} 分（尝试 ${i.attemptsUsed} 次，${i.status}）`
    ),
    "",
    `总分：${report.totalScore}/${report.totalPoints}`,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
