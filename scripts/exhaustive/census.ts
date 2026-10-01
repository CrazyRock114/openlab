/**
 * 穷举测试 L1/L2/L3：内容域全量 census（确定性退出码，CI 可跑）
 *
 * 覆盖域（枚举公式 = 口径）：
 *   D1 内容项   = content/items/**\/item.json（含 payload 完整性、幽灵字段、ID 唯一）
 *   D2 题库     = 各 item 的 quiz.json（答案合法性、语义 oracle、分值聚合）
 *   D3 路径     = content/pathways/*.json（条目引用/顺序不变量/时长聚合）
 *   D4 群集     = content/clusters/*.json（路径引用闭合）
 *   D5 首页配置 = content/home.json（区块引用闭合）
 *   L2 数值级联 = 枚举标签映射全覆盖（type/subject/license/bg 出现在内容中的每个值都有中文标签）
 *   L3 不变量   = 模拟实验条带单调性（片段越小迁移越远）、时长/分值为正
 */
import fs from "node:fs";
import path from "node:path";
import {
  BG_LABELS,
  LICENSE_LABELS,
  TYPE_LABELS,
} from "../../src/lib/content/labels";
import { SUBJECT_AREAS } from "../../src/lib/content/schema";
import { QuizSchema } from "../../src/lib/content/schema";

const ROOT = path.join(__dirname, "..", "..");
const CONTENT = path.join(ROOT, "content");
let failures = 0;
const check = (ok: boolean, label: string) => {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
};

/* ---------- D1 内容项 ---------- */
const itemsRoot = path.join(CONTENT, "items");
const orgs = fs.readdirSync(itemsRoot).filter((o) => fs.statSync(path.join(itemsRoot, o)).isDirectory());
const itemDirs: { dir: string; raw: Record<string, unknown>; id: string }[] = [];
for (const org of orgs) {
  for (const entry of fs.readdirSync(path.join(itemsRoot, org))) {
    const dir = path.join(itemsRoot, org, entry);
    if (fs.existsSync(path.join(dir, "item.json"))) {
      itemDirs.push({ dir, raw: JSON.parse(fs.readFileSync(path.join(dir, "item.json"), "utf8")), id: "" });
    }
  }
}
console.log(`\n[D1 内容项] 枚举到 ${itemDirs.length} 个 item.json`);
check(itemDirs.length === 5, `D1 总数 = 5（实际 ${itemDirs.length}）`);

const SCHEMA_KEYS = new Set([
  "id", "type", "title", "description", "subjectArea", "backgroundKnowledge",
  "learningObjectives", "tags", "durationMinutes", "language", "license",
  "authors", "organization", "status", "publishedAt",
  "bodyFile", "videoUrl", "quizFile", "maxAttempts", "sim",
]);
const ids = new Set<string>();
let byType: Record<string, number> = {};
for (const it of itemDirs) {
  const id = String(it.raw.id);
  it.id = id;
  check(!ids.has(id), `ID 唯一：${id}`);
  ids.add(id);
  const ghost = Object.keys(it.raw).filter((k) => !SCHEMA_KEYS.has(k));
  check(ghost.length === 0, `${id} 无幽灵字段${ghost.length ? `（发现 ${ghost.join(",")}）` : ""}`);
  byType[String(it.raw.type)] = (byType[String(it.raw.type)] ?? 0) + 1;
  check(Number(it.raw.durationMinutes) > 0, `${id} 时长为正`);
  check(Array.isArray(it.raw.learningObjectives) && (it.raw.learningObjectives as string[]).length > 0, `${id} 有学习目标`);
  check(BG_LABELS[String(it.raw.backgroundKnowledge)] !== undefined, `${id} backgroundKnowledge 有标签`);
  check((LICENSE_LABELS as Record<string, string>)[String(it.raw.license)] !== undefined, `${id} license 有标签`);
  check(SUBJECT_AREAS[String(it.raw.subjectArea)] !== undefined, `${id} subjectArea 有标签`);
  check((TYPE_LABELS as Record<string, string>)[String(it.raw.type)] !== undefined, `${id} type 有标签`);
}
console.log(`  类型分布: ${JSON.stringify(byType)}`);

/* payload 完整性 */
for (const it of itemDirs) {
  const meta = it.raw as Record<string, string | undefined>;
  if (meta.type === "lx_text") {
    const body = path.join(it.dir, meta.bodyFile ?? "content.md");
    const size = fs.existsSync(body) ? fs.statSync(body).size : 0;
    check(size > 500, `${it.id} 正文非空（${size}B）`);
  }
  if (meta.type === "assignment") {
    check(fs.existsSync(path.join(it.dir, meta.quizFile ?? "quiz.json")), `${it.id} 题库存在`);
  }
  if (meta.type === "video") {
    check(/^https:\/\/(www\.youtube\.com|youtu\.be|vimeo\.com|www\.bilibili\.com)/.test(meta.videoUrl ?? ""), `${it.id} 视频为可嵌入域`);
  }
  if (meta.type === "lx_simulation") {
    const stage = fs.readFileSync(path.join(ROOT, "src/components/content/simulation-stage.tsx"), "utf8");
    check(new RegExp(`"${meta.sim}"`).test(stage), `${it.id} sim key "${meta.sim}" 已注册渲染器`);
  }
}

/* ---------- D2 题库（含语义 oracle：答案依据内容事实人工核定） ---------- */
const ANSWER_ORACLE: Record<string, string> = {
  // oracle 依据：content.md「A–T、G–C」；「每个子代分子保留一条旧链（半保留复制）」；「基因是 DNA 上有功能的片段」
  "cx:demo:b7c25e93:assignment:1": "BBC",
};
for (const it of itemDirs) {
  const meta = it.raw as Record<string, string | undefined>;
  if (meta.type !== "assignment") continue;
  const quiz = QuizSchema.parse(JSON.parse(fs.readFileSync(path.join(it.dir, meta.quizFile ?? "quiz.json"), "utf8")));
  console.log(`\n[D2 题库] ${it.id}：${quiz.questions.length} 题`);
  const total = quiz.questions.reduce((s, q) => s + q.points, 0);
  check(quiz.questions.length === 3, "题数 = 3");
  check(total === 30, `总分 = 30（实际 ${total}）`);
  const keySig = quiz.questions.map((q) => q.answer).join("");
  check(keySig === ANSWER_ORACLE[it.id], `答案序列语义 oracle = ${ANSWER_ORACLE[it.id]}（实际 ${keySig}）`);
  for (const q of quiz.questions) {
    check(q.explanation.trim().length >= 10, `${q.id} 有解析`);
    check(new Set(q.choices.map((c) => c.key)).size === q.choices.length, `${q.id} 选项 key 不重复`);
  }
}

/* ---------- D3 路径 ---------- */
const pathways = fs.readdirSync(path.join(CONTENT, "pathways")).map((f) =>
  JSON.parse(fs.readFileSync(path.join(CONTENT, "pathways", f), "utf8"))
);
console.log(`\n[D3 路径] ${pathways.length} 条`);
for (const p of pathways) {
  check(p.entries.length === 4, `${p.id} 条目 = 4（实际 ${p.entries.length}）`);
  const types = p.entries.map((e: { itemId: string }) => String(e.itemId).split(":")[3]);
  // 不变量：入门路径按 图文→视频→测验→模拟 顺序（教学法最优序）
  check(JSON.stringify(types) === JSON.stringify(["lx_text", "video", "assignment", "lx_simulation"]), `顺序不变量 ${types.join("→")}`);
  const durSum = p.entries.reduce((s: number, e: { itemId: string }) => {
    const it = itemDirs.find((d) => d.id === e.itemId);
    return s + Number(it?.raw.durationMinutes ?? 0);
  }, 0);
  check(durSum === 44, `时长聚合 = 44 分钟（实际 ${durSum}）`);
  const notes = p.entries.filter((e: { educatorNotes?: string }) => e.educatorNotes).length;
  check(notes === 2, `教师备注 = 2 条（实际 ${notes}）`);
}

/* ---------- D4 群集 ---------- */
const clusters = fs.readdirSync(path.join(CONTENT, "clusters")).map((f) =>
  JSON.parse(fs.readFileSync(path.join(CONTENT, "clusters", f), "utf8"))
);
console.log(`\n[D4 群集] ${clusters.length} 个`);
for (const c of clusters) {
  check(c.pathways.every((pid: string) => pathways.some((p) => p.id === pid)), `${c.id} 路径引用闭合`);
}

/* ---------- D5 首页配置 ---------- */
const home = JSON.parse(fs.readFileSync(path.join(CONTENT, "home.json"), "utf8"));
console.log(`\n[D5 首页] featured 区块 ${home.featured.length} 个`);
const featuredIds = home.featured.flatMap((b: { itemIds: string[] }) => b.itemIds);
check(featuredIds.every((id: string) => ids.has(id)), "featured 引用闭合");
check(featuredIds.length === 4, `featured 共 4 项（实际 ${featuredIds.length}）`);
check(ids.has(home.highlightPathwayId.replace("cx-pathway:", "cx-pathway:")) || pathways.some((p) => p.id === home.highlightPathwayId), "highlightPathway 存在");

/* ---------- L3 模拟实验条带单调性（读组件源码数据，按泳道解析） ---------- */
const simSrc = fs.readFileSync(path.join(ROOT, "src/components/content/sims/gel-electrophoresis.tsx"), "utf8");
const lanesBlock = simSrc.slice(simSrc.indexOf("const LANES"), simSrc.indexOf("const WELL_TOP"));
// 格式无关解析：按 `name: "` 分块（兼容单行与多行泳道声明），再逐块提取 bands
const laneChunks = lanesBlock.split('name: "').slice(1);
const laneData = laneChunks.map((chunk) => ({
  name: chunk.slice(0, chunk.indexOf('"')),
  bands: [...chunk.matchAll(/label: "([\d.]+) kb", top: ([\d.]+)/g)].map((b) => ({ kb: parseFloat(b[1]), top: parseFloat(b[2]) })),
}));
console.log(`\n[L3] 泳道 ${laneData.length} 条: ${laneData.map((l) => `${l.name}(${l.bands.length}带)`).join(", ")}`);
check(laneData.length === 4, "泳道数 = 4（Marker + 3 样本）");
// 不变量 a：Marker 泳道按尺寸降序 top 严格递增（参照尺，条带数=5）
const marker = laneData.find((l) => l.name === "Marker") ?? { bands: [] };
const bySizeDesc = [...marker.bands].sort((a, b) => b.kb - a.kb);
const markerMonotonic = bySizeDesc.every((b, i) => i === 0 || b.top > bySizeDesc[i - 1].top);
check(marker.bands.length === 5 && markerMonotonic, `Marker 参照尺单调（${marker.bands.map((m) => `${m.kb}kb@${m.top}`).join(", ")}）`);
// 不变量 b：每条样本泳道按 kb 降序书写（即 top 随书写序递增），且每个尺寸都可在 Marker 对照
for (const lane of laneData.filter((l) => l.name !== "Marker")) {
  const desc = lane.bands.every((b, i) => i === 0 || lane.bands[i - 1].kb > b.kb);
  check(desc, `${lane.name} 条带按尺寸降序（${lane.bands.map((b) => b.kb + "kb").join(",")}）`);
  const allKnown = lane.bands.every((b) => marker.bands.some((m) => m.kb === b.kb));
  check(allKnown, `${lane.name} 条带尺寸均可在 Marker 对照`);
  // 不变量 c：样本条带 top 与 Marker 同尺寸偏差 ≤ 2（有意视觉抖动，不破坏可对照性）
  const maxDev = Math.max(...lane.bands.map((b) => {
    const m = marker.bands.find((mk) => mk.kb === b.kb);
    return m ? Math.abs(m.top - b.top) : 99;
  }));
  check(maxDev <= 2, `${lane.name} 与 Marker 同尺寸偏差 ≤2（最大 ${maxDev}）`);
}

/* ---------- 汇总 ---------- */
console.log(`\n${failures === 0 ? "✓✓ 穷举 census 全部通过" : `✗✗ ${failures} 处失败`}`);
process.exit(failures === 0 ? 0 : 1);
