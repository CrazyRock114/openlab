# LabXchange 全面调研报告（含复刻实施方案）

> 调研日期：2026-09-30
> 调研方式：线上站点实测（HTTP 头 / HTML / JS Bundle 逆向 / 官方 REST API 只读探测）+ GitHub 开源仓库 + 官方帮助中心/博客/新闻稿
> 调研目的：为复刻同类型教学网站提供产品、内容、技术三方面的完整参考

---

## 1. 平台概况

| 维度 | 事实 |
|---|---|
| 定位 | 面向全球高中生/本科生的**免费在线科学教育平台**，口号「Welcome to the world's science classroom（世界科学教室）」 |
| 出品方 | 哈佛大学（隶属 VPAL 副教务长办公室），创始人 Robert Lue（哈佛分子与细胞生物学教授、HarvardX 创始教师主任，2020 年去世） |
| 资金 | Amgen 基金会：2018 年 $650 万创始赞助 → 2022 年追加 $3000 万（累计约 $4300 万）→ 2025 年新一轮资助；2023 年起美国国防部资助数据科学项目（DSDSE） |
| 上线 | 2020 年 1 月全球上线（恰逢疫情远程教学潮）；2020 年 7 月获首个 Open edX 技术创新奖 |
| 规模（2024-09 官方） | **5000 万独立访客**、234 个国家和地区、28,000+ 资源、19+ 语言；**86% 访问者来自中低收入国家**；Top 用户国：印度、尼泊尔、巴基斯坦、美国、孟加拉等 |
| 库内容实测（2026-09 API） | 公开内容 **34,300 项**：视频 9,552、模拟实验 2,890、题库 2,520、Pathway 1,641、Cluster 68 |
| 商业模式 | **完全免费、无广告、无付费墙**；靠基金会慈善资助 + 哈佛机构背书 + 150+ 合作机构共建内容 + 300+ 教师大使网络（32 国）实现低成本全球扩张 |
| 核心子站 | 主站 www.labxchange.org ｜ about.（品牌叙事）｜ help.（Intercom 帮助中心）｜ educators.（教师大使/培训）｜ careerxplorer.（职业探索）｜ abe.（Amgen Biotech Experience） |

**核心竞争力（一句话）**：慈善资金 + 名校信用 + 自研高保真虚拟实验 + 「任何公共内容可 Copy-and-Edit 混编（Remix）」的内容生态飞轮 + 极低门槛的班级工具（班级代码即建即用）。

---

## 2. 站点信息架构（实测）

```
主站 www.labxchange.org（React SPA，Open edX 后端）
├─ 公共层（未登录可用，内容本身无需账号即可运行）
│  ├─ / 首页
│  │   Header：Logo｜科目 Subjects 下拉｜资料库 Library｜搜索框｜语言选择器(31 locale)
│  │           ｜「教育家」「学生」双受众下拉｜登录｜免费加入
│  │   Hero（世界科学教室 + 插画 + Explore/Sign up CTA）
│  │   ├─ 互动学习区（模拟/互动卡片，双受众入口）
│  │   ├─ 精选内容轮播（API 可配置区块：feature_card / pathways / clusters / list…）
│  │   ├─ How it works 三步（Explore → Create → Share）
│  │   ├─ 合作伙伴 Logo 墙（150+ 组织）
│  │   ├─ 资料库引流条（"28,500+ 资源"）
│  │   ├─ 用户评价滑块（教育者/学习者双视角）
│  │   └─ 国家定制首页变体（如日本版：本地课程匹配 + "全球 66,000 名教育者信赖"）
│  ├─ /library 资料库搜索页（全站内容搜索引擎）
│  │   ├─ 内容类型 pill（全部/模拟/视频/互动/路径/问题/问题集/案例研究/群集/教科书/文本…）
│  │   ├─ 筛选面板：学科域(16)｜背景知识门槛(none/some/extensive)｜视频时长｜来源机构
│  │   ｜         热门标签｜语言；每项带聚合计数(aggregations)
│  │   ├─ 排序：相关度/最新/最多浏览/最多收藏/最多重混/字母序/已发布；分页 24/48/96
│  │   └─ 内容卡片网格：头图+类型徽章+标题+作者+时长/语言+权限感知 kebab 菜单
│  ├─ /library/items/:itemKey 内容详情页（20 种类型共用一个壳）
│  │   ├─ 主舞台：Launch 模拟(iframe)｜视频播放器(逐句字幕+transcript)｜文本渲染｜问题作答器
│  │   ├─ 元数据：标题/头图/描述/学习目标/背景知识/作者与来源机构/语言/预计时长
│  │   ｜         许可证(LX1 或 CC BY / CC BY-NC / 公共领域)/统计(浏览·收藏·重混)
│  │   ├─ 操作条：收藏｜分享(6 渠道+Google Classroom+嵌入代码)｜指派到班级/路径｜备注｜举报
│  │   └─ 相关资源 + Topics 标签云 + 讨论区 + 推荐内容
│  ├─ /library/pathway/:key 学习路径（=可克隆的迷你课程）
│  │   ├─ 目录（有序混合类型列表）+ 学习目标 + 统计(favorites/views/clones)
│  │   ├─ /items/:itemKey 逐项学习视图：上一项/下一项｜标记完成｜进度条｜路径内备注
│  │   ├─ /new 与 /edit 路径编辑器（教育者）；「克隆和编辑」= Remix
│  │   └─ /library/clusters/:key 群集（Pathway 的上一级主题聚合，如 AP Bio）
│  ├─ /library/books/:key 数字教科书（模块化章节，可拆用混编）
│  ├─ /subjects 科目页｜/organizations 合作方列表 → /org/:slug 组织公开页
│  ├─ /c/:slug 国家课程页（ngss/caps/ncert 等课程标准映射）｜/topic/:slug 主题页
│  └─ 账户：/sign-in /sign-up /reset-password /onboarding /role-selection
│       注册多步向导：选身份(学习者/教育者)→年龄验证(≥13，教育者≥18)→账号或 SSO
│       →邮箱激活→可选加入班级(6 位班级代码)→选科目/年级
│       拒绝页：/denied/age｜/denied/country(禁运)｜/denied/sdn(制裁名单)｜/denied/blocked
├─ 登录层 /dashboard 控制面板
│  ├─ 学习者版：课程进度｜完成的路径(全部/已分配/收藏)｜总分｜徽章｜收藏夹
│  ├─ 教育者版：我的班级｜我的内容｜组织内容
│  ├─ 消息(私信/拉黑)｜通知(应用内+邮件细分)｜账户设置(头像/语言/两阶段账户删除)
│  └─ 角色切换：「切换到导师」单向不可逆升级制（二次确认）
├─ 班级层 /classes/:key（5 个 tab）
│  ├─ 课程(内容流)｜学者(成员管理·审批加入)｜进度(学生×内容矩阵+% Complete
│  ｜   +% Correct·CSV 导出)｜讨论(主题·回复·点赞·关注)｜进程
│  └─ 指派：Assign 弹窗（从公共库/收藏/私有库搜索）｜个别学生单独布置｜
│          问题集可设尝试次数与分值｜防重复指派｜Unposted Content 分批发布
└─ 组织管理层 /dashboard/org/:slug（profile/people/sources/内容发布审核）
```

---

## 3. 内容体系与教学法设计

### 3.1 内容组织三层级

```
资产（Asset，20 种类型）→ Pathway 学习路径（6–15 个资产的叙事式序列）→ Cluster 群集（路径合集，如 AP Bio）
```

### 3.2 内容类型枚举（20 种，前端实测）

`annotated_video` 注释视频｜`assignment` 问题集｜`assessment` 测评｜`audio`｜`book` 教科书｜`case_study` 案例研究｜`cluster` 群集｜`document`｜`lx_text` 富文本｜`image`｜`interactive` 滚动互动｜`lx_video` 视频｜`narrative` 人物故事｜`pathway` 路径｜`question` 问题｜`simulation` 模拟实验｜`teaching_guide` 教学指南｜`text`｜`video`｜`link`（Google 文档外链）

### 3.3 教学法差异化点

- **背景知识门槛（Background Knowledge）**：每个资源标注 none/some/extensive，学生可按自身水平筛选——这是它区别于普通资源库的核心筛选维度
- **学习目标（Learning Objectives）**：每个资源/路径强制标注，详情页显式展示
- **公共库题目无限重试 + 答错给澄清反馈**；教育者布置时可改为限次数/设分值用于正式评分
- **模拟实验内建虚拟实验记录本**：器材说明、实验目标、预测-对比、单步/全部重跑、自主设计实验、试错零成本
- **视频强制 transcript** 才能发布（无障碍合规）
- 每个资源带教师备注（教育者视角）与标签云（Topics）

### 3.4 虚拟实验（护城河所在）

- 自研约百个 HTML5 交互模拟，主打分子生物技术线（与 Amgen Biotech Experience 课程呼应）：凝胶电泳、PCR、限制性酶切、细菌转化、SDS-PAGE/Western Blot、蛋白纯化、微量移液、系列稀释、ELISA、渗透/膜运输、光合作用、显微镜、Hardy-Weinberg 建模、传染病扩散等；另有 3D 青蛙解剖（第三方）与数据科学线（电子表格模拟基于其开源 fortune-sheet 库）
- 技术形态：**前端无后端状态的交互应用**（进度仅存浏览器会话，服务端只记完成事件）→ 复刻成本可控
- 动画用 Lottie（After Effects 导出），视频用 Video.js + HLS/Vimeo

### 3.5 权限与许可模型

- **个人用户不能公开发布到公共库**——公共库发布权归 LabXchange 及合作机构；个人内容只能链接分享（需登录）或班级内使用 → 大幅降低内容审核成本，**复刻时强烈建议沿用**
- 内容许可：LX1（LabXchange 标准许可）+ CC BY / CC BY-NC 1.0–4.0 + 公共领域，详情页显式标注
- Remix：任何公共 Pathway 可 Clone-and-Edit；clones 计数公开展示（生态飞轮）
- ID 体系：`lb:<org>:<8位hex>:<type>:<version>`（Open edX OpaqueKey 扩展）；Pathway `lx-pathway:uuid`；Cluster `lx-cluster:slug`
- 元数据标准：schema.org **LearningResource** JSON-LD（`isAccessibleForFree` 等字段）

---

## 4. 技术架构（逆向实测确认）

### 4.1 总体架构

```
用户 ── CloudFront CDN ── Django(Open edX 定制) 源站
 │                            │
 │ www.labxchange.org         ├─ Open edX 引擎（LMS/Studio + Blockstore
 │  (React 18 SPA, SEO 块)     │   + Content Libraries v2 + 自研 XBlock）
 │                            ├─ DRF REST API ── api.www.labxchange.org
 ├─ media.labxchange.org ─────┤      (210 端点, OAuth2 + Session)
 │  (S3 版本化 + immutable 缓存) ├─ Elasticsearch（搜索聚合/同义词）
 └─ 子站: about/help(Intercom) └─ Celery 异步（浏览/收藏/重混计数）
        /educators/careerxplorer/abe
```

### 4.2 分层技术清单（含证据）

| 层 | LabXchange 实际方案 | 关键证据 |
|---|---|---|
| 前端框架 | **React 18 + TypeScript SPA**，Vite(Rolldown) 构建，路由级懒加载 | bundle 内 `createRoot`、`rolldown-runtime.*.js`、`__vite__mapDeps` |
| UI 体系 | **自研设计系统**（`lx-*` 类名 ×930，1.59MB CSS），底座 Bootstrap 4 网格 + Popper；未开源 | App CSS 类名分析；npm 无发布 |
| i18n | react-intl (FormatJS/ICU)，**31 个 locale**，语言包独立 chunk 懒加载；cookie `labxchange_language` 协商；RTL(ar/he/fa/ur) 自动 `body.rtl` | i18n chunk 还原 |
| 富文本/媒体 | TinyMCE 5、Video.js + HLS + Vimeo、D3、MathJax、Lottie | bundle 依赖计数 |
| 后端 | **Django + DRF**（Router API 根目录、405 文体、`Vary: Accept, origin, Authorization`） | `GET /api/v1/` 实测 |
| 认证 | django-oauth-toolkit（OAuth2 Authorization Code + session cookie）；SSO 与 edX.org 账号互通（auth-backends） | `/oauth2/authorize/` 302 实测 |
| 特性开关 | django-waffle | `/users/waffle_status/` |
| 图片处理 | django-versatileimagefield（`__sized__` 裁剪 URL） | 媒体 URL 格式 |
| 搜索 | **Elasticsearch**：`POST /search/library`，聚合 `{SubjectArea:{buckets:[{key,doc_count}]}}` 原生透传；自维护同义词库 | bundle + fork 仓库 |
| 内容存储 | **Open edX Blockstore**（版本化、文件型、TB 级）+ Content Libraries v2 + Learning Context 抽象（course/library/pathway 平级）；内容项=XBlock(OLX)，前端经 `/xblocks/{id}/student_view_data` 拉数据自行渲染 | Open edX 官方博客 + XBlock 端点 |
| 内容 ID | labxchange-keys（自定义 OpaqueKey `lb:org:hex:type:ver`） | 归档仓库 |
| CDN/存储 | CloudFront + S3（版本化、`immutable` 缓存 1 年） | 响应头实测 |
| SEO | **混合渲染**：Django 模板把 SEO 块（H1/meta/JSON-LD/目录）渲染进 `#root`，上面盖 loading 遮罩，React 挂载后替换；robots.txt 精细策略；程序化 sitemap（clusters/collections/content 三分册） | HTML 注释 + sitemap 实测 |
| 可观测/运营 | Datadog RUM、GA/gtag、Amplitude、Facebook Pixel、Zendesk 客服、Usersnap 反馈 | bundle 注入脚本 |
| 合规 | 13+ 年龄门、教育者 18+、国家禁运(embargo)、美国 SDN 制裁名单拦截、两阶段账户删除 | 拒绝页路由 + API |

### 4.3 关键 API 形态（复刻参考）

```
POST /api/v1/search/library        # body: {mode, keywords, filters[], exclude, ordering,
                                   #        current_page, pagination_size}
                                   # → {count, results, aggregations, featured_collections}
                                   # mode: public/owned/favorites/organization-owned/...
GET  /api/v1/items/{id}            # 内容元数据
GET  /api/v1/xblocks/{id}/student_view_data        # 课件块数据（20 类内容共用）
POST /api/v1/xblocks/{id}/submit_question_answer   # 答题上报
POST /api/v1/xblocks/{id}/save_user_video_state    # 视频进度
GET  /api/v1/explore/header + /explore_contents/{id} # 首页可配置区块
GET  /api/v1/library/subject_areas | /library/library_count
GET  /api/v1/search/library_popular_queries        # 热搜词
GET  /api/v1/organizations/list_partners
     + classrooms/classroom-items/classroom-memberships/classroom-threads
     + discussions/threads | notifications | favorites | curriculums(?country=US→ngss)
```

### 4.4 开源现状（重要）

- GitHub org `LabXchange` 仅剩 8 个公开仓库且**核心仓库全部归档**：`labxchange-xblocks`（自研 XBlock：Assignment/CaseStudy/Simulation/AnnotatedVideo 等，Apache-2.0）、`lx-pathway-plugin`（Pathway 实现为 Open edX 顶层 Learning Context，AGPL，OpenCraft 开发）、`labxchange-keys`；著名的 `react-component-library`（设计系统）与 `data-vocabulary`（元数据 schema）**已 404 下架**
- 真正的开源贡献在 **Open edX 上游**：Blockstore、Content Libraries v2、XBlock Runtime v2（Learning Context 抽象）
- 开发方：OpenCraft（Open edX 服务商）主力 + edX 支持，历时约 2 年

---

## 5. 复刻实施方案

### 5.1 法律边界（先讲清楚）

可以复刻：**功能、信息架构、交互模式、教学法设计**（思想不受版权保护）。
不可以做：复制其内容（视频/模拟/文本受版权保护）、使用 LabXchange 名称/Logo/视觉识别、抓取其 API 数据建站、仿冒 Harvard/Amgen 背书。建议自建品牌 + 自制/CC 内容。

### 5.2 两条技术路线

**路线 A：直接部署 Open edX（最忠实）**
- LMS/Studio + Content Libraries v2，仿 LabXchange 自建 React 前端消费 `student_view_data` 类 API
- 优点：XBlock 插件生态、课程/进度/班级模型现成；缺点：运维重（Django+MongoDB+MySQL+Celery+ES 全家桶），定制学习曲线陡，团队需 Open edX 经验

**路线 B：自建简化版（推荐）**
- 用现代栈重写「内容库 + 路径 + 班级 + 创作」四大件，XBlock 语义抽象为「内容类型插件注册表」
- 优点：完全可控、体量轻、迭代快；缺点：进度/班级模型需自建

**推荐：路线 B 起步，保持数据模型与 Open edX 概念兼容**（内容 ID 四段式、LearningResource JSON-LD、pathway/cluster 层级），未来需要时可迁移。

### 5.3 推荐技术选型（路线 B）

| 层 | 选型 | 对应 LabXchange |
|---|---|---|
| 前端 | React 18 + TS + Vite + TanStack Router/Query；组件库 shadcn/ui 或 Ant Design 定制主题 | React SPA + 自研 lx-* 设计系统 |
| 内容详情壳 | 单一 ItemPlayer 壳 + 内容类型插件注册表（simulation/video/quiz/text…各注册渲染器与状态接口） | XBlock student_view_data 两级接口 |
| 后端 | Django + DRF（或 NestJS/Prisma；Django 与其形态完全对齐且生态成熟） | Django + DRF |
| 认证 | Session/JWT + django-allauth（OAuth SSO 预留） | django-oauth-toolkit |
| 数据库 | PostgreSQL（JSONB 存内容元数据 + 版本表），S3 兼容对象存储存媒体 | Blockstore(文件型) + S3 |
| 搜索 | PostgreSQL FTS 起步 → Meilisearch/OpenSearch（聚合 facets 驱动筛选面板）；计数异步化 | Elasticsearch aggregations |
| SEO | Next.js(SSR) 或「Django 模板注入 SEO 块 + SPA 替换」轻方案；程序化 sitemap 分册 | loading 遮罩 + seo-crawlable-content |
| i18n | react-intl 或 i18next + 懒加载语言包 + RTL 方案 | FormatJS + 31 locale |
| 模拟实验 | HTML5/React 交互应用 + Lottie 动画；无后端状态、仅上报完成事件 | 同 |
| 基建 | CloudFront/CDN + 对象存储；Sentry + PostHog 替代 Datadog/Amplitude | 同 |

### 5.4 核心数据模型（ER 概要）

```
Organization(name, slug, logo, description)          # 来源机构/合作方
User(role: learner|educator, locale, avatar, ...)    # 单向升级 educator
Item(                                                # 万物皆内容项（20 类共用）
  id: "lb:<org>:<uuid>:<type>:<version>",            # 四段式不可变 ID
  type, title, description, cover, language,
  subject_area, background_knowledge: none|some|extensive,
  learning_objectives[], tags[], duration, license: LX1|CC_BY|CC_BY_NC|PD,
  org_id, authors[], status: draft|published,
  stats{views, favorites, clones}, payload JSONB     # 类型特有数据（插件化）
)
ItemVersion(item_id, version, payload, changelog)    # 版本化
Pathway(id: lx-pathway:uuid, title, objectives, license, org)
PathwayEntry(pathway_id, item_id, order, educator_notes, learning_objectives)
Cluster(id: lx-cluster:slug, title, description, pathway_ids[])
Classroom(code: 6位, title, cover, owner, co_educators[], archived)
ClassroomMembership(classroom_id, user_id, status: pending|approved|rejected)
Assignment(classroom_id, item_id, due, max_attempts, points, posted_at,
           assignee: all|user_ids[])                 # 支持个别学生单独布置
Progress(user_id, item_id, classroom_id?, status, percent, score, attempts)
Favorite / Note(user_id, item_id, body) / Thread(item_id|classroom_id, posts[])
```

### 5.5 分期路线图

**M0 骨架（~4 周）**：项目脚手架（前端 SPA + Django API + PG + S3）、用户体系（注册多步向导/登录/角色）、Item 模型 + 4 种内容类型（text/video/question/simulation 外壳）、详情页 + 播放壳、SEO 方案落地
**M1 资料库（~4 周）**：搜索 + 筛选面板（学科/类型/背景知识/语言/时长/来源 + 聚合计数）、排序/分页、内容卡片、收藏/备注、首页（Hero + 可配置精选区块 + 合作方墙）
**M2 学习路径（~3 周）**：Pathway 编辑器（增删排序、学习目标、教师备注）、逐项学习视图（上一项/下一项/标记完成/进度条）、Cluster、Clone-and-Edit Remix + clones 计数
**M3 班级（~4 周）**：班级创建（6 位代码/封面/共同教育者）、学生申请-审批、Assign 弹窗（防重/分批发布/个别布置）、进度矩阵 + CSV 导出、班级讨论区
**M4 创作与生态（~6 周）**：问题集构建器（尝试次数/分值）、注释视频编辑器（transcript）、机构空间与发布审核流、i18n 懒加载语言包、通知/消息
**持续投入（护城河）**：虚拟实验内容管线（每学期产出 N 个 HTML5 模拟 + Lottie 动画 + 实验记录本模板）；教师大使/培训课程运营

### 5.6 复刻必做 vs 可裁剪

**必须做（产品骨架）**：三层内容模型（资产→pathway→cluster）、统一检索库 + Background Knowledge 筛选、20 类共用详情壳、可克隆 Pathway、班级代码 + 审批 + 进度矩阵
**差异化必做（壁垒）**：一批高保真虚拟实验（建议单学科线先打透，如生物技术线）
**建议沿用（省钱设计）**：个人内容不进公共库（省审核）、模拟无后端状态（省服务端）、视频强制 transcript（无障碍 + SEO）、SEO 块混合渲染（低成本高收益）
**可以裁剪**：多机构合作生态（后期再建）、33 语言本地化（先双语）、CareerXplorer/国家课程映射/教科书、制裁名单等合规拦截（视目标市场）
**不要复刻**：其成本结构（数千万美元基金会资助）——应以单学科、单一资金来源、轻运营切入

---

## 6. 附录

### 6.1 16 个学科域
Biological Sciences｜Chemistry｜Data Science｜Earth & Space Science｜Economics｜Educator Skills｜Environmental Science｜Global Health｜Health Science｜Learner Support｜Mathematics｜Physics｜Prepare For Careers｜Science & Society｜Scientific Process｜Other

### 6.2 主要信息来源
- Open edX 官方博客 "LabXchange is launched!"（架构最权威）：https://openedx.org/blog/labxchange-is-launched/
- Amgen 基金会新闻稿（2018 立项 $6.5M / 2022 追加 $30M）：https://www.amgen.com/newsroom/press-releases/2022/06/amgen-foundation-more-than-doubles-commitment-to-labxchange-free-virtual-science-education-platform
- 5000 万访客里程碑：https://about.labxchange.org/blog/celebrating-50-million-visitors-to-labxchange
- 帮助中心（内容类型/班级/remix 全说明）：https://help.labxchange.org/
- GitHub org：https://github.com/orgs/LabXchange/repositories
- 线上实测：www.labxchange.org HTTP 头/HTML/JS bundle、api.www.labxchange.org 只读 GET

*报告完 — 由三路并行深度调研（站点架构 70 次工具调用 / 技术栈 83 次 / 内容与运营 62 次）汇总而成*
