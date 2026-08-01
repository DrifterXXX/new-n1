# JLPT N1 备考中心 — 设计规范 (MASTER)

> 项目设计契约源文件。设计某页面时先读本文件，再检查 `pages/<page>.md` 是否存在（存在则覆盖对应字段）。
> 已存在条目只追加/修正，不整篇重写。

**寄存器**: Product（设计服务产品，标杆 Linear / Notion）
**主题**: 「墨と藍」Ink & Sea — 沉静学者气质，为高密度日语材料服务
**三轴刻度**: DESIGN_VARIANCE **3**（结构可预测）· MOTION_INTENSITY **2**（仅功能性动效）· VISUAL_DENSITY **7**（高密度但可读）
**技术栈**: Vue 3 SPA · 本地优先 · 本阶段不部署

---

## 1. Visual Theme & Atmosphere

- 关键词：**沉静 / 可读 / 低干扰 / 学者气 / 克制**
- 核心原则「打开就是学习台」——首屏直接呈现"今天做什么、哪里薄弱、下一题从哪开始"，零花哨、零营销腔。
- **明确拒绝 Duolingo 式游戏化**：不用吉祥物、彩带、连击弹窗、红心惩罚、排行榜压力。只保留"安静的进度信号"（进度条 + 数字），不制造焦虑。
- 借鉴：Linear 的结构与克制、Notion 的密集内容可读性、Anki/阅读器的信息密度。氛围来自"墨蓝 accent + 明朝体读解正文 + 大量留白行高"，而非背景色或装饰。
- 默认浅色（白天学习），提供深色（夜间降眼疲劳，用户高频需求）。

## 2. Color Palette & Roles

Token 全量见 `tokens.css` / `design-tokens.json`。**命名约定**：颜色一律 `--color-*`，组件禁裸 hex 只用 `var(--color-*)`（与架构 tokens 契约对齐）。**基线**：沿用旧版单文件配色迭代。

- **中性色占 85%+**：`--color-bg / --color-surface / --color-surface-2 / --color-text / --color-text-2 / --color-text-muted / --color-border`。
- **Primary（墨蓝 ink-sea `#173F4D`，旧版基线）每屏 ≤2 处可见使用**——通常是"主 CTA + 当前 nav 高亮"。滥用即视觉噪音。深色模式提亮为 `#4DB3AC`。
- **语义色专用于答题反馈**（沿用旧版 correct/wrong）：正解 `--color-success`(#2E7D50) / 错误 `--color-danger`(#B84A3D，印章感) / 提示 `--color-warn`(琥珀)。各带 `-soft`(浅底) 与 `-strong`(文字) 变体。
- **答题反馈不得只靠颜色**：正解/错误必须同时带图标（`check` / `x`）+ 文本，满足色盲可达。
- Primary 命名按用途（`--color-primary` 不叫 `--color-teal`）。深色 `--color-primary-on` 翻转为深色（亮 teal 上压深字）。
- 禁止裸 hex（唯一例外 `#fff`/`#000`）；禁止紫→粉渐变；禁止纯黑/纯灰直出。

## 3. Typography Rules

- **多脚本分工**（关键决策）：
  - `--font-jp` Noto Sans JP → 日文 UI、例文、题干、选项
  - `--font-reading` **Noto Serif JP（明朝体）→ 仅读解长文正文**，还原日语印刷/教科书阅读质感（非通用 editorial serif 套路，严格限定长文）
  - `--font-cn` Noto Sans SC → 中文译文/说明
  - `--font-ui` Inter → UI chrome/标签
  - `--font-mono` JetBrains Mono → 仪表盘数字/统计（等宽对齐）
- **日文需更大字号 + 更宽行高**：例文 `--text-lg`(18px)/`--leading-jp`(1.85)；读解正文 `--text-md`(16px)/`--leading-reading`(1.95)。
- 字距：日文 `--tracking-jp`(0.02em)；ALL CAPS 分组标签 `--tracking-caps`(0.08em)；≥24px 标题 `--tracking-tight`。
- 三级字重：400 正文 / 500 强调 / 700 标题·CTA。最多两种"字型语气"（sans + 明朝），mono 不计。
- 正文行宽 50–75 拉丁字符（日文约 30–40 字）。

## 4. Component Stylings

| 组件 | 背景 | 文字 | 圆角 | 内边距 | 说明 |
|---|---|---|---|---|---|
| Button / Primary | `--color-primary` | `--color-primary-on` | `--radius-sm` | 10px 16px | 高 ≥36px；主操作 |
| Button / Secondary | `--color-surface`+1px border | `--color-text` | `--radius-sm` | 10px 16px | hover 边框转 primary |
| Button / Ghost | 透明 | `--color-text-2` | `--radius-sm` | — | 次要动作 |
| Button / Danger | `--color-surface`+`--color-danger` border | `--color-danger` | `--radius-sm` | — | 破坏性操作需二次确认 |
| Card / 题卡 | `--color-surface` | `--color-text` | `--radius-md` | `--space-5` | 1px 边框，无默认阴影，hover 边框转 strong |
| Panel / 侧栏面板 | `--color-surface` | — | `--radius-lg` | `--space-5` | 承载用法提示/分页 |
| Input / Search | `--color-surface` | `--color-text` | `--radius-sm` | 高 ≥40px | focus 显示 `--focus-ring` |
| Chip / 过滤标签 | 默认透明；active `--color-primary-soft`+`--color-primary` 文字 | — | `--radius-pill` | 6px 12px | 题型过滤 |
| Tag / 元数据 | `--color-surface-2` | `--color-text-meta` | `--radius-sm` | 2px 8px | grammar/vocab 标签 |
| Audio 圆钮 | 默认 `--color-surface`+border；播放中 `--color-primary` 实心 | — | `--radius-pill` | ≥32px | play/pause 图标切换 |
| Progress bar | 轨 `--color-surface-2` / 填充 `--color-primary`（错题用 `--color-danger`） | — | `--radius-pill` | 高 6px | 安静、无动画装饰 |

- **禁止**：彩色左边框强调（用整边框换色代替）、幽灵卡（1px border + ≥16px blur 阴影同现）、过度圆角（>16px）。

## 5. Layout Principles

- **App Shell**：左侧 `--sidebar-w`(248px) 常驻导航 + 顶栏（视图标题/副标题 + 全局控件）+ 内容区。
- **导航分组**（7 项扁平 → 4 组，降认知负荷）：
  - 学习：学习台 · 题型训练
  - 题库：文法词汇 · 听解题库 · 读解题库
  - 复盘：错题本
  - 指南：考试策略
- **内容区双栏 study-layout**：主内容（minmax(0,1fr)）+ 侧面板（用法提示/分页/规则），侧面板在窄屏折叠到底部。
- 栅格：桌面 12 / 平板 8 / 手机 4；容器 `--container-max`；沟槽 28/20/16。
- 节区节奏 32/24/16px（密度 7，偏紧凑）。
- 顶栏 sticky + 轻微毛玻璃（功能性，非装饰）。

## 6. Depth & Elevation

- 三级：`--elev-flat`（默认，靠边框）/ `--elev-raised`（浮层卡片/下拉）/ `--elev-overlay`（Modal/ActionSheet）。
- Product 寄存器：**优先 1px 边框区分层级，阴影克制**。
- 深色模式：用亮度递进（`--color-bg`→`--color-surface`→`--color-surface-2`）表达层级，而非阴影；浮层加 ring。

## 7. Do's and Don'ts

**Do**
- accent 每屏 ≤2 处；答题反馈图标+文本+颜色三重编码
- 日文大字号宽行高；读解用明朝体
- 音频"先听后看原文"：script 默认折叠，答题后才可展开
- 破坏性操作（清空错题）二次确认 + 可撤销 toast
- 全组件覆盖 9 态；键盘可达（1–4 选项 / Enter 下一题）

**Don't（触发即重写）**
- emoji 作功能图标（**P0**）
- 紫→粉渐变 / Indigo→Pink 三件套（**P0**）
- "Welcome to"/Lorem ipsum/千篇一律 Hero（**P0**）
- 裸 hex 颜色、非 4px 间距、纯黑纯灰直出
- 游戏化压力元素（吉祥物/彩带/红心惩罚/排行榜）
- 装饰性动效、循环动画、页面加载编排（MOTION 2）

## 8. Responsive Behavior

- 断点：`<768` 手机 / `768–1023` 平板 / `≥1024` 桌面 / `≥1280` 大屏。
- 导航：桌面左侧栏 → 平板可折叠图标轨(64px) → **手机底部 TabBar（5 项：学习/题库/训练/错题/更多，其余入"更多"）**。
- 触摸目标 ≥44×44px，选项按钮全宽、间距 ≥8px。
- 读解統合理解：桌面 A/B 并排，手机上下堆叠。
- 音频控制在手机端 dock 到底部 TabBar 上方（播客式迷你条）。
- viewport 允许缩放，无横向滚动。

## 9. Agent Prompt Guide（给前端 Vue Agent）

- **消费 Token**：CSS 唯一来源 = `src/styles/tokens.css`（全局 import 一次）；组件样式只用 `var(--color-*)` / `var(--space-*)` 等，**不写裸 hex**。需要在 JS 里读值时 `import tokens from '@/design-tokens.json'`（架构决定放置位置）。深浅色切换用 `document.documentElement.dataset.theme`，持久化到 localStorage。
- **图标唯一出口** = `src/components/common/AppIcon.vue`（封装 `lucide-vue-next`）；组件不直接 import lucide，统一 `<AppIcon name="play" :size="20" />`，color 走 currentColor 随文字 token。白名单见下表 + design-tokens.json `icons`。
- **图标库锁定 `lucide-vue-next`**，stroke 2，尺寸 16/20/24，**全项目唯一，不混用，零 emoji**。常用映射见下。
- 字体 `@import` Google Fonts：Noto Sans JP(400/500/700) · Noto Serif JP(400/600) · Noto Sans SC(400/500/700) · Inter(400/500/600) · JetBrains Mono(500)。`font-display: swap` + preconnect。
- 音频组件抽为单例 `useAudioPlayer()`：play/pause/loading/error(TTS 回退) 四态；支持倍速 0.75/1.0/1.25（JLPT 听解训练关键）；全局音量持久化。
- 所有列表/答题区必须实现 9 态（尤其 Loading 骨架 / Empty 引导 / Error 重试）。
- a11y：focus-visible 已在 tokens.css 提供 baseline；图标按钮必须 `aria-label`；答题反馈用图标+文本不只颜色。

### Lucide 图标映射（锁定）
| 语义 | 图标 | 语义 | 图标 |
|---|---|---|---|
| 学习台 | `layout-dashboard` | 播放/暂停 | `play` / `pause` |
| 题型训练 | `dumbbell` | 音量 | `volume-2` / `volume-x` |
| 文法词汇 | `book-open` | 倍速 | `gauge` |
| 听解题库 | `headphones` | 正解 | `check` / `circle-check` |
| 读解题库 | `file-text` | 错误 | `x` / `circle-x` |
| 错题本 | `rotate-ccw` | 收藏 | `bookmark` |
| 考试策略 | `target` | 搜索 | `search` |
| 更多 | `ellipsis` | 展开原文 | `chevron-down` |
| 下一题 | `arrow-right` | 上一题 | `arrow-left` |
| 主题切换 | `sun` / `moon` | 重置/清空 | `refresh-cw` / `trash-2` |
| 已完成 | `circle-check` | 待办 | `circle` |

---

## 视图信息架构与关键交互（7 视图）

### ① 学习台 Dashboard —「打开即见」
- **信息架构**：4 指标卡（今日完成 / 累计答题 / 正确率 / 待回收错题，数字用 mono）→ 今日任务清单（可勾选，≤4 项）→ 下一步 CTA（今日20题 / 只练薄弱 / 进错题本 / 看策略）→ 三栏细分（听解各题型正确率 / 读解各题型正确率 / 内容规模）。
- **交互**：任务勾选即存本地；"今日20题"= 主 accent CTA（每屏唯一强调按钮）；进度条安静无动画装饰；正确率环形/条形只读。
- **状态**：首次无数据 → Empty 引导"从今日20题开始"，指标显示 0 而非空白。

### ② 题型训练 Train
- **信息架构**：无 session 时显示模式选择（混合20 / 薄弱优先 / 错题回练 / 专项题库 4 张模式卡）→ 进入后顶部显示进度（第 n/N + 细进度条）+ 单题 → 结束显示本组小结（正确/错误/正确率）。
- **关键交互**：
  - **键盘流**：数字键 1–4 选选项，Enter/→ 下一题，←上一题（急躁高手角色）。
  - 选项选中即锁定，立即反馈：正解绿+check、误选红+x，其余变灰；解析面板 slide-down（180ms）。
  - 听解题：先播音频，"原文"按钮答题后才可展开（强制先听）。
  - 结束页 CTA：再来20题 / 回收错题。
- **状态**：Loading（切题）、Empty（错题回练但无错题→引导）、Edge（超长题干/选项换行不溢出）。

### ③ 文法词汇 Examples
- **信息架构**：顶部搜索框（搜日文/中文/文法/词汇）+ 计数 + 清空 → 例文列表（每行：日文例句大字 / 中文译文 / grammar·vocab 标签 / 再生音频钮 / 收藏钮）+ 侧面板（用法三步：听→跟读→遮中文复述 / 分页）。
- **关键交互**：音频钮 play/pause 图标切换；收藏 toggle（bookmark 实心/描边）；搜索实时过滤 + 高亮命中；日文可选中复制。
- **状态**：无匹配 → Empty"没有匹配例文，试试更短关键词"；搜索中防抖。

### ④ 听解题库 Listening
- **信息架构**：题型 Tab（全部 / 課題理解 / ポイント理解 / 概要理解 / 即時応答）→ 题卡列表（题型+编号 / 听钮 / 收藏 / 题干 / 选项带单项听钮 / 折叠原文 / 解析）+ 侧面板（听解规则）。
- **关键交互**：
  - **音频优先流**：先播整段音频（真人录音，缺失回退浏览器 TTS 并 toast 告知）；**原文默认隐藏，答题后才展开**（"不要边看原文边选"）。
  - 每个选项带独立"听"钮（option_audio），播放中实心高亮。
  - 倍速控件 0.75/1.0/1.25（听力精听/泛听切换）。
- **状态**：音频 Loading（钮显 spinner）、Error（TTS 回退提示）、答题后 script 展开。

### ⑤ 读解题库 Reading
- **信息架构**：题型 Tab（内容理解短/中/長 · 統合理解 · 主張理解長文 · 情報検索）→ 单篇文章（明朝体正文 + 标题 + 收藏）+ 设问区（問1.. 选项）+ 侧面板（读解动作：先看设问→读首尾/转折句→检索题只定位）。每页一篇（PER_PAGE.reading=1）。
- **关键交互**：
  - 統合理解：文章 A / 文章 B 桌面并排、手机堆叠。
  - 建议"先看设问"——可将设问锚点置顶或提供"回到设问"浮钮。
  - 长文正文用 `--font-reading` 明朝体 + `--leading-reading`，段落间距充足，降阅读疲劳。
  - 选项作答反馈同训练页（图标+色+解析）。
- **状态**：无文章 Empty；超长文正文滚动不破版。

### ⑥ 错题本 Review —「回收闭环」
- **信息架构**：过滤 Chip（错题 / 最近 / 收藏）+ "清空错题记录"（danger）→ 回收列表（复用对应题卡）+ 分页。
- **关键交互**：
  - 每条错题可加"错因备注"（文本）——山姆/复盘核心，写清错因才算处理。
  - "清空错题" = **破坏性操作，二次确认 Modal + 撤销 toast**（莱利压力测试角色：防误删）。
  - 支持从错题直接"再练一次"跳训练。
- **状态**：Empty 分三态——无错题"今天没有错题，去训练积累"+CTA；无最近；无收藏"收藏考前要复习的材料"。

### ⑦ 考试策略 Strategy
- **信息架构**：6 张策略卡（每日节奏 / 听解 / 读解 / 文法词汇 / 考场分配 / 最后七天），每卡标题 + 要点列表。
- **交互**：纯阅读，密度稍高的三栏网格；无音频/答题；可作为静态参考。低干扰、易扫读。
- **状态**：静态内容，无空/错态。

---

## 全局音频交互规范（贯穿 ③④⑤ + 训练）
- 单例播放器：同一时刻仅一个音频播放，切换自动停上一条。
- 四态：idle（描边钮）/ playing（accent 实心 + pause 图标）/ loading（spinner）/ error（回退 TTS，toast "本题真人音频未生成，暂用浏览器朗读"）。
- 全局音量条（顶栏）+ 倍速（听解页）；音量/倍速持久化 localStorage。
- 手机端播放时底部 dock 迷你条（当前条目 + play/pause + 进度）。
