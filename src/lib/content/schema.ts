import { z } from "zod";

/**
 * 内容元数据 Schema（构建期与运行时共用）
 *
 * 内容 ID 采用四段式（借鉴 Open edX OpaqueKey）：
 *   cx:<org>:<8位hex>:<类型>:<版本>   例如 cx:demo:7c13cc95:lx_simulation:1
 * 路径 cx-pathway:<uuid>，群集 cx-cluster:<slug>
 */

export const ITEM_TYPES = [
  "lx_text",
  "video",
  "assignment",
  "lx_simulation",
  "interactive",
  "question",
  "assessment",
  "case_study",
  "narrative",
  "teaching_guide",
  "audio",
  "image",
  "document",
  "book",
  "pathway",
  "cluster",
  "link",
  "annotated_video",
  "text",
  "lx_video",
] as const;

/** 全量 20 种内容类型（UI 标签等场景使用） */
export type AnyItemType = (typeof ITEM_TYPES)[number];

/** M0 支持渲染的内容类型（插件注册表） */
export const RENDERABLE_TYPES = ["lx_text", "video", "assignment", "lx_simulation"] as const;

export const LICENSES = ["lx_standard", "CC_BY_4", "CC_BY_SA_4", "CC_BY_NC_4", "CC_BY_NC_SA_4", "PD"] as const;
export const BACKGROUND_KNOWLEDGE = ["none", "some", "extensive"] as const;

const ChoiceKey = z.enum(["A", "B", "C", "D", "E", "F"]);

const baseMeta = {
  id: z
    .string()
    .regex(
      /^cx:[a-z0-9-]+:[0-9a-f]{8}:[a-z_]+:[1-9]\d*$/,
      "ID 需形如 cx:<org>:<8位hex>:<类型>:<版本>，例如 cx:demo:7c13cc95:lx_simulation:1"
    ),
  title: z.string().min(1, "标题不能为空"),
  description: z.string().default(""),
  subjectArea: z.string().min(1, "必须指定学科域（见 SUBJECT_AREAS）"),
  backgroundKnowledge: z.enum(BACKGROUND_KNOWLEDGE),
  learningObjectives: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  durationMinutes: z.number().int().positive("预计时长必须为正整数（分钟）"),
  language: z.string().default("zh-hans"),
  license: z.enum(LICENSES),
  authors: z.array(z.object({ name: z.string().min(1), org: z.string().optional() })).min(1, "至少一位作者"),
  organization: z.string().min(1, "必须归属一个组织（org slug）"),
  status: z.enum(["draft", "published"]).default("published"),
  /** 发布日期 YYYY-MM-DD（用于「最新添加」排序） */
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "publishedAt 需为 YYYY-MM-DD 格式").optional(),
};

/** 内容项：按类型判别联合——每种类型声明自己必需的 payload 字段 */
export const ItemSchema = z.discriminatedUnion("type", [
  z.object({ ...baseMeta, type: z.literal("lx_text"), bodyFile: z.string().default("content.md") }),
  z.object({ ...baseMeta, type: z.literal("video"), videoUrl: z.string().url("视频需提供可嵌入的 URL（YouTube/Vimeo/Bilibili）") }),
  z.object({
    ...baseMeta,
    type: z.literal("assignment"),
    quizFile: z.string().default("quiz.json"),
    /** null = 公共库默认：无限重试；数字 = 教师布置时的限制次数 */
    maxAttempts: z.number().int().positive().nullable().default(null),
  }),
  z.object({ ...baseMeta, type: z.literal("lx_simulation"), sim: z.string().min(1, "需注册一个模拟实验 key") }),
]);

export type Item = z.infer<typeof ItemSchema>;
export type ItemType = Item["type"];

/** 题库文件 schema */
export const QuizSchema = z.object({
  title: z.string().min(1),
  questions: z
    .array(
      z
        .object({
          id: z.string().min(1),
          stem: z.string().min(1, "题干不能为空"),
          choices: z
            .array(z.object({ key: ChoiceKey, text: z.string().min(1) }))
            .min(2, "至少两个选项"),
          answer: ChoiceKey,
          explanation: z.string().default(""),
          points: z.number().int().positive().default(10),
        })
        .superRefine((q, ctx) => {
          const keys = q.choices.map((c) => c.key);
          if (!keys.includes(q.answer)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["answer"],
              message: `答案 ${q.answer} 不在选项 [${keys.join(", ")}] 中`,
            });
          }
          if (new Set(keys).size !== keys.length) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["choices"], message: "选项 key 重复" });
          }
        })
    )
    .min(1, "至少一道题"),
});

export type Quiz = z.infer<typeof QuizSchema>;

/** 学习路径 schema */
export const PathwaySchema = z.object({
  id: z
    .string()
    .regex(/^cx-pathway:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, "路径 ID 需形如 cx-pathway:<uuid>"),
  title: z.string().min(1),
  description: z.string().default(""),
  learningObjectives: z.array(z.string()).default([]),
  language: z.string().default("zh-hans"),
  license: z.enum(LICENSES),
  authors: z.array(z.object({ name: z.string().min(1) })).min(1),
  entries: z
    .array(z.object({ itemId: z.string(), educatorNotes: z.string().optional() }))
    .min(1, "路径至少包含一个条目"),
});

export type Pathway = z.infer<typeof PathwaySchema>;

/** 群集（路径的上一级聚合）schema */
export const ClusterSchema = z.object({
  id: z.string().regex(/^cx-cluster:[a-z0-9-]+$/, "群集 ID 需形如 cx-cluster:<slug>"),
  title: z.string().min(1),
  description: z.string().default(""),
  tags: z.array(z.string()).default([]),
  pathways: z.array(z.string()).min(1, "群集至少包含一条路径"),
});

export type Cluster = z.infer<typeof ClusterSchema>;

/** 首页可配置区块（对应 LabXchange 的 explore_contents） */
export const HomeSchema = z.object({
  hero: z.object({
    title: z.string().min(1),
    subtitle: z.string().default(""),
    primaryCta: z.object({ label: z.string(), href: z.string() }),
    secondaryCta: z.object({ label: z.string(), href: z.string() }),
  }),
  featured: z
    .array(z.object({ title: z.string().min(1), itemIds: z.array(z.string()).min(1) }))
    .default([]),
  highlightPathwayId: z.string().optional(),
});

export type HomeContent = z.infer<typeof HomeSchema>;

/** 学科域（对齐 LabXchange 16 域，取常用子集并随需扩展） */
export const SUBJECT_AREAS: Record<string, string> = {
  "biological-sciences": "生物科学",
  chemistry: "化学",
  physics: "物理学",
  mathematics: "数学",
  "data-science": "数据科学",
  "earth-space-science": "地球与空间科学",
  "environmental-science": "环境科学",
  "health-science": "健康科学",
  "scientific-process": "科学过程",
  "science-society": "科学与社会",
};
