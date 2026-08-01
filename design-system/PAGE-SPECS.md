# JLPT N1 备考中心 — 逐页可构建设计规格 (PAGE-SPECS)

> 依据：`docs/SPEC.md` §7(页面清单)/§8(Token)/§10(约束) + `design-system/MASTER.md`(7视图IA/交互) + `design-system/tokens.css`(唯一颜色源)。
> **本文件是前端逐页构建依据**。组件树对应 SPEC §7 核心组件；所有间距/圆角/阴影/颜色取 Token 变量，**零裸 hex**（唯一例外 `#fff`/`#000`）。
> **图标**：全部 Lucide（`lucide-vue-next`，stroke 2，尺寸 16/20/24），经 `AppIcon.vue` 唯一出口，color=currentColor 随文字 Token；零 emoji。
> **断点**：桌面 ≥960px rail 侧栏；移动 <960px 底部 TabBar（对齐 SPEC §10，authoritative）。

---

## 0. 全局共享组件（先建，各页复用）

### 0.1 AppShell.vue（布局骨架）
- **职责**：组合 `AppSidebar` + `AppTopbar` + `<RouterView>` + `MobileTabBar`（<960 显示）+ 全局 `ToastHost` + `AudioMiniDock`（移动播放态）。仅布局，无业务。
- **结构**：CSS Grid `grid-template-columns: var(--sidebar-w) minmax(0,1fr)`；<960 塌成单列，侧栏隐藏、底部 TabBar 显示。
- **Token**：容器 `max-width: var(--container-max)`；内容区 padding `var(--space-6)`（桌面）/`var(--space-4)`（移动）；节区间距 `var(--space-8)`。

### 0.2 AppSidebar.vue（左侧导航，桌面）
- **职责**：7 路由项，视觉分 4 组（路由不变，仅加分组小标签降认知负荷）。
- **分组 + 图标（Lucide）**：
  - 学习：学习台 `layout-dashboard` · 题型训练 `dumbbell`
  - 题库：文法词汇 `book-open` · 听解题库 `headphones` · 读解题库 `file-text`
  - 复盘：错题本 `rotate-ccw`
  - 指南：考试策略 `target`
- **状态**：default `--color-text-2`；hover 底 `--color-surface-2`；**active** 底 `--color-primary-soft` + 文字/图标 `--color-primary`（每屏 primary 可见处之一）。图标 20px。
- **分组标签**：`--text-xs` + `--tracking-caps`(ALL CAPS) + `--color-text-meta`，margin `var(--space-4)` 上。
- **Token**：宽 `var(--sidebar-w)`；项 padding `var(--space-3)`；圆角 `var(--radius-sm)`；分隔 `1px solid var(--color-border)`。
- **响应式**：960–1200 可折叠为 rail（`var(--sidebar-rail-w)`，仅图标 + tooltip）；<960 不渲染。

### 0.3 AppTopbar.vue（顶栏，sticky）
- **职责**：左显当前视图标题+副标题；右放全局控件。
- **控件（左→右）**：`VolumeControl`(`volume-2`/`volume-x` 图标 + range)、`继续训练`(secondary btn)、`今日 20 题`(**primary btn，每屏唯一强调 CTA**)、`ThemeToggle`(`sun`/`moon`)、`打开设置`(`settings-2` 图标钮→ SettingsDrawer)。
- **Token**：底 `rgba` 由 `--color-bg` 派生 + `backdrop-filter: blur(10px)`（功能性）；下边框 `1px solid var(--color-border)`；padding `var(--space-4) var(--space-6)`；标题 `--text-xl`/`--fw-announce`，副标题 `--text-sm`/`--color-text-muted`。
- **响应式**：<960 收起标题副文案，控件转图标钮，`今日20题` 保留为主 CTA。

### 0.4 AppIcon.vue（图标唯一出口）
- **职责**：封装 `lucide-vue-next`，`<AppIcon name size=20 />`，白名单校验（非白名单 dev 告警）。color 继承 currentColor。
- **Props**：`name`(白名单枚举)、`size`(16|20|24，默认 20)、`aria-label`(图标按钮必填)。

### 0.5 AudioPlayer（`useAudioPlayer()` 单例 composable + 触发钮 `AudioBtn.vue`）
- **职责**：全局单一音频，切换自动停上一条。四态状态机。
- **四态（SPEC AC-09）**：
  | 态 | 视觉 | 图标 |
  |---|---|---|
  | idle | 描边钮 `--color-surface`+`1px --color-border` | `play` |
  | playing | 实心 `--color-primary` + `--color-primary-on` 文字 | `pause` |
  | loading | 钮内 spinner（`loader` 旋转，reduced-motion 时静态） | `loader` |
  | error→TTS | 回退浏览器 TTS + Toast「本题真人音频未生成，暂用浏览器朗读」 | `play` + `info` 角标 |
- **倍速**（听解，SPEC AC-06）：`gauge` 图标 + 0.75/1.0/1.25 循环切换钮；持久化 `settings.playbackRate`。
- **音量**：全局 range，持久化 `settings.volume`。
- **AudioMiniDock**（<960 播放态）：底部 dock 于 TabBar 上方，显当前条目 + play/pause + 进度条（`--color-primary` 填充）。
- **Token**：圆钮 `--radius-pill`，尺寸 ≥`var(--tap-min)`（移动）；过渡 `var(--motion-fast) var(--ease)`。

### 0.6 MobileTabBar.vue（<960 底部导航）
- **职责**：5 项 = 学习台 `layout-dashboard` / 题库 `book-open`(聚合入口) / 训练 `dumbbell` / 错题 `rotate-ccw` / 更多 `ellipsis`（其余入抽屉）。
- **Token**：高 `56px` + `env(safe-area-inset-bottom)`；项 ≥`var(--tap-min)`；图标 24px + 标签 `--text-xs`；active `--color-primary`，inactive `--color-text-muted`；顶边框 `1px solid var(--color-border)`。

### 0.7 SettingsDrawer.vue（右侧抽屉，承载 SPEC 无独立页的 P0 设置）[新增/需评审]
- **职责**：集中 SPEC 中无页面归属的设置项——**导入/导出 JSON 备份(AC-05 P0)**、字号调节(AC-08/字体 P2)、每日目标 dailyTarget、深浅色（与顶栏 toggle 同源）。
- **内容块**：
  - 数据备份：`导出备份`(`download` 图标 secondary btn) / `导入备份`(`upload` 图标 + file input)；导入非法 JSON → `--color-danger` inline 错误 + Toast 拒绝。
  - 显示：字号 slider（`type-outline` 无则用 `a-large-small`，回退纯文本「字号」）；主题 sun/moon 段控。
  - 学习：每日目标 stepper（数字 `--font-mono`）。
- **Token**：抽屉 `--elev-overlay` + `--radius-lg`（左侧圆角）；宽 360px（<960 全宽）；遮罩 `rgba(0,0,0,.32)`。
- **图标补充白名单**：`download` / `upload`（数据备份专用，请架构补入 §8.3）。

### 0.8 通用原子（各页复用）
- **Toast.vue**：底部居中，`--color-surface` + `--elev-overlay` + `--radius-md`；支持「撤销」行动按钮（错题清空用）。
- **ModalConfirm.vue**：二次确认（危险操作）；标题 + 描述 + 取消(ghost)/确认(danger)；`--elev-overlay`。
- **EmptyState.vue**：居中图标(24, `--color-text-meta`) + 主文案(`--color-text`) + 引导 CTA；**每页文案不同、非空洞占位**。
- **SkeletonBlock.vue**：`--color-surface-2` 底 + 微光扫过（reduced-motion 时静态）；题库/音频加载态。
- **Pager.vue**：首/上/页码/下/末；`chevrons-left`/`chevron-left`/`chevron-right`/`chevrons-right`；禁用态 `opacity` 降 + `--color-text-meta`。
- **Chip.vue / Tag.vue**：过滤 Chip（active `--color-primary-soft`+`--color-primary`）；元数据 Tag（`--color-surface-2`+`--color-text-meta`）。

---

## 1. 学习台 /dashboard —「打开即见」

**组件树**
```
DashboardView
├─ MetricCard ×4        指标(数字+标签+进度条)，数字 --font-mono
├─ TodayTaskList        今日任务(≤4 可勾选 checkbox)
│  └─ TaskItem          单任务(勾选状态)
├─ NextStepPanel        下一步 CTA 组
└─ TypeAccuracy ×3      听解正确率 / 读解正确率 / 内容规模
   └─ StatRow           单行(题型名 + 正确率/未练)
```
**关键交互**
- MetricCard：今日完成/累计答题/正确率/待回收错题；进度条填充 `--color-primary`（错题卡用 `--color-danger`），**安静无装饰动画**。
- TaskItem 勾选 → 写 `daily.tasks` 本地；勾选态图标 `circle-check`(`--color-success`)，未勾 `circle`(`--color-text-meta`)。
- NextStepPanel：`今日20题`(primary，唯一强调) / `只练薄弱` / `进错题本` / `看策略`(后三 secondary)。
- **空/加载/错误三态**：首次无数据 → 指标显 0（非空白）+ `EmptyState`「从今日 20 题开始你的备考」+ 主 CTA；数据读取中 → MetricCard 骨架；读取失败 → inline 重试。
**响应式**：指标卡桌面 4 列 → 平板 2 列 → <960 单列；三栏统计 <960 堆叠。
**图标**：`layout-dashboard`(nav)、`circle-check`/`circle`(任务)、`arrow-right`(CTA 尾)、指标可选前缀 `check-circle`/`layers`/`percent`/`rotate-ccw`。

---

## 2. 题型训练 /train

**组件树**
```
TrainView
├─ ModeCard ×4          无 session 时：混合20/薄弱优先/错题回练/专项题库
├─ QuestionFlow         有 session：进度 + 单题
│  ├─ SessionProgress   第 n/N + 细进度条
│  ├─ QuestionRenderer  按 kind 渲染(复用 ListeningCard/QuestionBlock)
│  └─ OptionButton ×N   选项(9态)
├─ Explanation          解析(slide-down)
└─ SessionSummary       结束：正确/错误/正确率
```
**关键交互**
- **键盘流(SPEC AC-06 体验)**：数字键 `1-4` 选选项，`Enter`/`→` 下一题，`←` 上一题；焦点态走 `--focus-ring`。
- OptionButton 9 态；选中即锁定：正解 `--color-success-soft`底+`--color-success`边+`--color-success-strong`字+`check` 图标；误选 `--color-danger-soft`+`--color-danger`边+`--color-danger-strong`字+`x` 图标；其余转灰。**三重编码=图标+文本+颜色**。
- 作答后 `Explanation` slide-down（`var(--motion-base) var(--ease)`，高度过渡）。
- 听解题：先播音频，「原文」`chevron-down` 答题后才可展开（强制先听）。
- 掌握判定(AC-03)：错题回练模式下连对≥3次的题不再抽取（数据侧 content-service/store 负责，UI 仅呈现）。
**空/加载/错误三态**：错题回练但无错题 → `EmptyState`「暂无错题，先去做几组积累」+跳训练；切题 loading 骨架；题数据缺失 → 容错跳过 + inline 提示。
**响应式**：ModeCard 桌面 2×2 → <960 单列；选项按钮全宽、间距 ≥`var(--space-2)`、高 ≥`var(--tap-min)`。
**图标**：`dumbbell`(nav)、`arrow-left`/`arrow-right`(导航)、`check`/`x`(反馈)、`chevron-down`/`chevron-up`(原文/解析)、`play`/`pause`(听解题)。

---

## 3. 文法词汇 /examples

**组件树**
```
ExamplesView
├─ SearchBar            搜索(日文/中文/文法/词汇)+计数+清空
├─ ExampleRow ×N        单例文行
│  ├─ (jp 大字 / cn 译文)
│  ├─ Tag ×2            grammar / vocab
│  ├─ AudioBtn          再生
│  └─ FavBtn            收藏(toggle)
├─ SidePanel            用法三步说明
└─ Pager
```
**关键交互**
- SearchBar 实时过滤(防抖 ~200ms) + 命中高亮(`--color-warn-soft` 底)；`search` 图标前缀 + `x` 清空。
- ExampleRow：jp `--font-jp`/`--text-lg`/`--leading-jp`，可选中复制；cn `--font-cn`/`--text-base`/`--color-text-muted`。
- AudioBtn 走 §0.5 四态；FavBtn `bookmark`(描边 idle / 实心 `--color-primary` active)，toggle 写 favorites。
**空/加载/错误三态**：无匹配 → `EmptyState`「没有匹配例文，试试更短的关键词」；首屏 EXAMPLES 懒加载中 → 行骨架；音频失败 → TTS 回退。
**响应式**：桌面主+侧面板双栏 → <960 侧面板折叠到顶部为可收起说明；行内音频/收藏钮 ≥`var(--tap-min)`。
**图标**：`book-open`(nav)、`search`、`x`、`play`/`pause`、`bookmark`。

---

## 4. 听解题库 /listening

**组件树**
```
ListeningView
├─ TypeTabs            全部/課題理解/ポイント理解/概要理解/即時応答
├─ ListeningCard ×N
│  ├─ CardHead         题型+编号 / 听钮 / 收藏
│  ├─ AudioPlayer      整段音频(四态 + 倍速)
│  ├─ QuestionText
│  ├─ OptionButton ×N  每选项带独立听钮(option_audio)
│  ├─ ScriptToggle     原文(默认隐藏，答题后可展开)
│  └─ Explanation
├─ SidePanel           听解规则
└─ Pager
```
**关键交互**
- **音频优先流**：先播整段（真人，缺失回退 TTS+Toast）；**原文 `ScriptToggle` 默认隐藏、答题后才展开**（「不要边看原文边选」）。
- 倍速 `gauge` 0.75/1.0/1.25（精听/泛听），持久化。
- 每选项独立「听」钮：播放中该钮实心 `--color-primary`；点击 `stopPropagation` 不触发选择。
- OptionButton 反馈同 §2（三重编码）。
**空/加载/错误三态**：该题型无题 → `EmptyState`；音频 loading → 钮 spinner；音频 error → TTS 回退 + Toast。
**响应式**：主+侧面板 <960 侧栏折叠；<960 播放态底部 `AudioMiniDock`；选项听钮 ≥`var(--tap-min)`。
**图标**：`headphones`(nav)、`play`/`pause`/`loader`、`gauge`(倍速)、`volume-2`/`volume-x`、`chevron-down`(原文)、`bookmark`、`check`/`x`、`info`(TTS 回退)。

---

## 5. 读解题库 /reading

**组件树**
```
ReadingView
├─ TypeTabs            短/中/長/統合/主張長文/情報検索
├─ ReadingArticle     单篇(每页一篇, PER_PAGE=1)
│  ├─ ArticleHead      题型 + 标题 + 收藏
│  ├─ ArticleBody      明朝体长文(統合理解: A/B 双栏)
│  └─ QuestionBlock ×N 問n + 选项 + 解析
│     └─ OptionButton ×N
├─ SidePanel          读解动作(先看设问→首尾/转折→检索定位) + 回到设问
└─ Pager
```
**关键交互**
- ArticleBody **`--font-reading` Noto Serif JP 明朝体** + `--text-md`/`--leading-reading`(1.95)，段间距 `var(--space-4)`，降阅读疲劳。
- 統合理解：A/B 桌面并排（`minmax(0,1fr) minmax(0,1fr)`）→ <960 上下堆叠，各带「文章A/B」小标。
- 「回到设问」浮钮（`arrow-up`）：长文快速跳设问锚点。
- OptionButton 反馈同 §2；answer 由 content-service 归一 0-based（读解源 1-based）。
**空/加载/错误三态**：无文章 → `EmptyState`；READINGS 懒加载 → 段落骨架；缺字段容错渲染。
**响应式**：正文行宽控制在 ~40 日文字；<960 单栏；收藏/翻页钮 ≥`var(--tap-min)`。
**图标**：`file-text`(nav)、`bookmark`、`arrow-up`(回设问)、`chevrons-left`/`chevron-left`/`chevron-right`/`chevrons-right`(Pager)、`check`/`x`。

---

## 6. 错题本 /review —「回收闭环」

**组件树**
```
ReviewView
├─ FilterTabs         错题 / 最近 / 收藏
├─ ClearButton        清空错题记录(danger) → ModalConfirm
├─ ReviewItem ×N      复用对应题卡(listening/reading/example)
│  └─ ErrorNote       错因备注(可编辑文本)
├─ ModalConfirm       二次确认(清空)
└─ Pager
```
**关键交互**
- **清空错题 = 破坏性操作**：`trash-2` danger 钮 → `ModalConfirm`「清空全部错题记录？此操作不可恢复」→ 确认后执行 + `Toast` 带**「撤销」**（撤销窗口内可恢复，防误删/莱利压力测试）。
- `ErrorNote`：每条可写错因（`--font-cn`），blur 即存 `answers[key].meta.note`（需数据侧加字段，见 advisory）；`pencil` 图标进入编辑。
- 支持「再练一次」跳 /train 错题回练。
- 掌握态(AC-03)：连对≥3 的题在错题过滤中不再出现。
**空/加载/错误三态（分三态引导，文案各异）**：
  - 错题空 → 「今天没有错题，去训练积累」+跳训练
  - 最近空 → 「还没有答题记录」
  - 收藏空 → 「收藏考前要复习的材料，这里集中回收」
**响应式**：FilterTabs 横滑；<960 单列；`ErrorNote` 全宽。
**图标**：`rotate-ccw`(nav)、`trash-2`(清空)、`pencil`(备注)、`rotate-ccw`(再练)、`check`/`x`、`bookmark`。

---

## 7. 考试策略 /strategy

**组件树**
```
StrategyView
└─ StrategyCard ×6     每日节奏/听解/读解/文法词汇/考场分配/最后七天
   ├─ CardTitle
   └─ BulletList       要点列表
```
**关键交互**：纯阅读，无音频/答题。卡片标题 `--text-xl`/`--fw-emphasis`，要点 `--text-base`/`--leading-body`；`--color-text` 主、要点标记用 `--color-primary` 小圆点（非 emoji）。
**空/加载/错误**：静态内容，无空/错态。
**响应式**：桌面 3 列 → 平板 2 列 → <960 单列。
**图标**：`target`(nav)。卡片标题可选语义前缀（`calendar`/`headphones`/`file-text`/`book-open`/`clock`/`flag`），保持 Lucide 单源。

---

## 附：全局约束速查（前端自检）
- 颜色只用 `var(--color-*)`；间距 `var(--space-*)`；圆角 `var(--radius-*)`；阴影 `var(--elev-*)`；动效 `var(--motion-*)`+`var(--ease)`。**零裸 hex**（仅 `#fff`/`#000`）。
- 图标只经 `AppIcon`，Lucide 白名单内；图标按钮必带 `aria-label`；答题反馈图标+文本+颜色三重编码。
- 触摸目标 ≥`var(--tap-min)`(44px)；键盘可达 + `--focus-ring`；`prefers-reduced-motion` 停非必要动效。
- 每页覆盖 空/加载/错误 三态，文案具体非占位；破坏性操作二次确认 + 可撤销。
- 断点 960px：≥960 rail 侧栏 / <960 底部 TabBar。
