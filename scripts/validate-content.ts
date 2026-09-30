/**
 * 内容全量校验脚本（CI / next build 前置）
 *
 * 检查内容：
 * 1. 所有 item.json / quiz.json / pathway / cluster / home.json 符合 Zod schema
 * 2. 引用完整性（路径→内容项、群集→路径、首页→内容项）
 * 3. payload 文件存在（图文正文、题库文件）
 * 4. 输出内容库统计
 */
import fs from "node:fs";
import path from "node:path";
import { QuizSchema, type Item } from "../src/lib/content/schema";
import { contentSummary, getAllContent } from "../src/lib/content/repository";

const CONTENT_ROOT = path.join(process.cwd(), "content");

let errors = 0;
const fail = (msg: string) => {
  errors++;
  console.error(`  ✗ ${msg}`);
};

function validatePayloadFiles() {
  const itemsDir = path.join(CONTENT_ROOT, "items");
  if (!fs.existsSync(itemsDir)) {
    fail("content/items 目录不存在");
    return;
  }
  for (const org of fs.readdirSync(itemsDir)) {
    const orgDir = path.join(itemsDir, org);
    if (!fs.statSync(orgDir).isDirectory()) continue;
    for (const entry of fs.readdirSync(orgDir)) {
      const itemDir = path.join(orgDir, entry);
      const metaPath = path.join(itemDir, "item.json");
      if (!fs.existsSync(metaPath)) continue;

      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as Item;
      if (meta.type === "lx_text") {
        const body = path.join(itemDir, meta.bodyFile ?? "content.md");
        if (!fs.existsSync(body)) fail(`${meta.id} 缺少正文文件 ${meta.bodyFile ?? "content.md"}`);
      }
      if (meta.type === "assignment") {
        const quizPath = path.join(itemDir, meta.quizFile ?? "quiz.json");
        if (!fs.existsSync(quizPath)) {
          fail(`${meta.id} 缺少题库文件 ${meta.quizFile ?? "quiz.json"}`);
          continue;
        }
        const parsed = QuizSchema.safeParse(JSON.parse(fs.readFileSync(quizPath, "utf8")));
        if (!parsed.success) {
          for (const issue of parsed.error.issues) {
            fail(`${meta.id} 题库 ${meta.quizFile ?? "quiz.json"} → ${issue.path.join(".")}: ${issue.message}`);
          }
        }
      }
    }
  }
}

try {
  const summary = contentSummary();
  const { items, pathways, clusters } = getAllContent();

  validatePayloadFiles();

  // 未渲染类型提示（schema 只接受 M0 已注册的 4 种类型，出现其他类型会直接失败——此处兜底提示）
  const unknown = items.filter((i) => !["lx_text", "video", "assignment", "lx_simulation"].includes(i.meta.type));
  for (const i of unknown) fail(`${i.meta.id} 的类型 ${i.meta.type} 尚未注册渲染器`);

  if (errors > 0) {
    console.error(`\n✗ 内容校验未通过，共 ${errors} 处问题。`);
    process.exit(1);
  }

  const byTypeText = Object.entries(summary.byType)
    .map(([t, n]) => `${t} ${n}`)
    .join(" · ");
  console.log(
    `✓ 内容校验通过：${summary.published}/${summary.total} 个内容项（${byTypeText}）· ${summary.pathways} 条学习路径 · ${summary.clusters} 个群集`
  );
  void items;
  void clusters;
  void getAllContent; // 引用完整性已在 getAllContent 中执行
} catch (err) {
  console.error(`✗ 内容校验未通过：${(err as Error).message}`);
  process.exit(1);
}
