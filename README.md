# OpenLab · 开放科学课堂

LabXchange 式免费科学教育平台的**纯静态实现**（无后端版，当前进度 **M3**）：`git push` 即部署 Vercel，零服务器、零运维、零费用起步。

- 调研报告：[LabXchange-全面调研报告.md](./LabXchange-全面调研报告.md)
- 实施方案：[复刻实施方案-Vercel无后端版.md](./复刻实施方案-Vercel无后端版.md)

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 15（App Router，`output: "export"` 全静态导出）+ React 19 + TypeScript |
| 样式 | Tailwind CSS v4 + @tailwindcss/typography（图文排版） |
| 内容校验 | Zod（构建期 + 运行时同一份 schema） |
| 全文搜索 | **Pagefind**（`postbuild` 对 out/ 建索引，支持中文；运行时 ESM+wasm 纯客户端检索） |
| 图标 | lucide-react |
| 学习数据 | **Dexie（IndexedDB）**：进度 / 收藏 / 笔记 / 路径草稿，`useLiveQuery` 响应式 UI；自动迁移 M0 localStorage 进度 |
| 部署 | Vercel / 任意静态托管（out/ 目录，含 GitHub Pages） |

## 快速开始

```bash
npm install
npm run dev        # http://localhost:3000（dev 无搜索索引，资料库自动降级为本地过滤）
npm run validate   # 内容全量校验（构建前自动执行）
npm run build      # 校验 + 静态导出 + pagefind 建索引（postbuild）
npm run preview    # 本地预览 out/（serve）
```

## 目录结构

```
content/                    ★ 内容库（git 即 CMS，PR 即审核）
  items/<org>/<8位hex>/     内容项：item.json + payload（content.md / quiz.json / …）
  pathways/<uuid>.json      学习路径（有序条目 + 教师备注）
  clusters/<slug>.json      群集（路径合集）
  home.json                 首页可配置区块（Hero / 精选 / 重点路径）
src/
  lib/content/schema.ts     ★ Zod schema：item.json / quiz / pathway / cluster / home
  lib/content/repository.ts 构建期内容加载器（校验 + 引用完整性检查）
  lib/content/labels.tsx    类型标签 / 学科 / 许可 / 背景知识门槛映射
  components/content/       ItemPlayer 壳 + 渲染器（markdown / video / quiz / simulation）
  app/                      页面（全部 SSG）
scripts/validate-content.ts 内容校验 CLI（CI 与 prebuild 共用）
```

## 内容类型（M0 已注册 4 种渲染器）

| 类型 | ID `type` 段 | payload |
|---|---|---|
| 图文 | `lx_text` | `content.md`（Markdown + GFM 表格） |
| 视频 | `video` | `videoUrl`（YouTube / Vimeo / Bilibili 自动转嵌入） |
| 问题集 | `assignment` | `quiz.json`（单选题；公共模式无限重试 + 澄清解析；`maxAttempts` 可限次数） |
| 模拟实验 | `lx_simulation` | `sim: "<key>"`（在 `simulation-stage.tsx` 的 REGISTRY 注册 React 组件；内置凝胶电泳演示） |

**新增一个内容项**：`content/items/<org>/<hex8>/` 下放 `item.json`（+ 对应 payload 文件），ID 形如 `cx:<org>:<hex8>:<type>:<version>`，可选 `publishedAt: "YYYY-MM-DD"`（用于「最新添加」排序）。保存后 dev 即时生效；`npm run build` 会全量校验 schema 与引用完整性（路径→内容项、群集→路径、首页→内容项），坏数据直接让 CI 失败。

示例内容：图文《DNA：生命的说明书》→ 视频《免疫系统》→ 测验《DNA 与遗传》→ 模拟《凝胶电泳》，外加《如何设计一个对照实验》（科学过程学科）；前四者被编排进学习路径「遗传学入门」与群集「生物核心概念」。

## 资料库搜索与筛选（M1）

- **全文搜索**：Pagefind 对全部内容详情页建索引（`data-pagefind-body` 圈定正文区，中文按字索引），搜索框输入即查，命中正文深处的关键词（如某图文的「下一步」段落提到凝胶电泳也会被检出）
- **Facets 聚合筛选**：类型 / 学科域 / 背景知识门槛 / 时长分桶 / 语言 / 来源 / 热门标签（Top 15），每个选项的计数 = 满足「其余维度 + 当前搜索」的数量（跨维度联动），LabXchange 同款交互
- **排序**：相关度（搜索时默认）/ 最新添加（`publishedAt`）/ 标题 / 时长；每页 24/48/96
- **URL 状态同步**：`/library/?q=电泳&bg=none&sort=relevance` 可直接分享、刷新可恢复（首页搜索框即 GET 表单，无 JS 也可用）
- **降级策略**：`next dev` 下无 pagefind 产物 → 自动降级为标题/描述/标签的本地过滤

## 学习闭环（M2）

- **逐项学习视图** `/library/pathway/<key>/item/<itemId>`：路径上下文头（第 N 步 + 进度条）+ 教师备注 + 上一步/下一步 + 标记完成
- **进度**：条目完成写入 IndexedDB；路径 % = 已完成条目/总条目，实时反映在路径页与「我的学习」
- **收藏与笔记**：详情页一键收藏（图标即状态）、每资源一条个人笔记，均存本机
- **Remix（Clone-and-Edit）**：公共路径页一键「克隆并编辑」→ 复制为本机草稿进入编辑器（含条目与教师备注），LabXchange 同款内容飞轮
- **路径编辑器** `/library/pathway/edit`：标题/简介/学习目标/作者/许可、从资料库搜索添加条目、排序、逐条教师备注、**防抖自动保存**（URL 带 `?id=` 可回访）、**导出 JSON**（标准格式，可直接提 PR 进公共库）、删除草稿
- **详情页联动**：「添加到草稿路径」下拉（无草稿时一键新建并加入）
- **我的学习** `/dashboard`：统计卡（已完成/收藏/草稿）、各路径进度条与状态、草稿管理（编辑/导出/删除）、收藏网格

## 布置码：无后端教学闭环（M3）

**文件即传输介质**——教师和学生之间靠 `assignment.json` 文件完成整个教学流程，全程无需账号与服务器：

```
教师：/assignments/new 组卷（从资料库添加内容、每项设分值/每题限次、截止日期）
      → 导出 assignment.json 发给学生
学生：/assignments 导入文件（选文件或粘贴 JSON，Zod 校验）
      → 点「开始学习」进入作业模式（详情页出现作业横幅：作业名/截止/剩余次数）
      → 问题集自动限次计分（分数按比例折算到作业分值），完成自动上报
      → 导出报告 JSON 或复制文本报告回传老师
```

- **作业模式**：详情页 URL 带 `?a=<作业ID>` 即激活（`AssignmentModeProvider`），QuizRenderer 限次计分、CompleteButton 上报完成，对内容页零侵入
- **作业中心** `/assignments`：学生视角（进度条/得分/明细表/报告导出）+ 教师视角（我布置的作业/编辑/重新导出）
- **分值口径**：编辑器默认取题库内部总分，测验得分按比例折算到教师设定的作业分值
- **本地学习档案** `/onboarding`：3 步向导（身份/称呼/学段与科目）存本机，dashboard 按名字问候

## SEO（已内置）

- 全部页面 SSG，详情页带完整 OG/Twitter meta
- 每个内容页注入 schema.org **LearningResource** JSON-LD（对齐 LabXchange）
- 程序化 `sitemap.xml`（页面 + 全部内容/路径/群集）与 `robots.txt`
- 全站 OG 图（`app/opengraph-image.tsx` 生成 1200×630）

## 部署到 Vercel

1. 推到 GitHub → Vercel「Import Project」→ 框架自动识别 Next.js，零配置
2. （可选）环境变量 `NEXT_PUBLIC_SITE_URL=https://你的域名`（用于 sitemap/OG 绝对链接）
3. 每次合并到 main 自动构建发布；PR 自动生成预览环境——**内容审核直接看 Preview URL**

也兼容 GitHub Pages / Netlify / 任意静态服务器（导出为 `<path>/index.html` 目录结构，无需 clean-url 特性）。

## 路线图

- ✅ **M0 骨架**：内容管线 + 4 种渲染器 + 资料库/首页/路径/群集 + SEO
- ✅ **M1 搜索与筛选**：Pagefind 全文索引 + facets 聚合筛选 + 排序分页 + URL 状态同步
- ✅ **M2 学习闭环**：IndexedDB 数据层 + 逐项学习视图 + 收藏/笔记 + Remix + 路径编辑器 + 我的学习中心
- ✅ **M3 布置码**：教师组卷导出 → 学生导入作业模式（限次计分）→ 报告回传；本地 onboarding 档案
- **M4（可选动态层）** Auth.js + Vercel Postgres/KV：云同步进度、真班级（审批/布置/进度矩阵 CSV）、教师实时查看学生报告
