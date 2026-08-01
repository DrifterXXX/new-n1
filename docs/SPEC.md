# Spec - JLPT N1 备考中心 v1.0 (Route B: Vue 重构)

> 生成日期：2026-08-01
> 基于：PRD v1.0 + 架构文档 v1.0 (ARCHITECTURE.md) + UIUX 设计方向 v1.0 (design-system/MASTER.md)
> 状态：已确认（Phase 1 三文档用户确认 + 4 项待定已裁决）
> 配套契约代码：src/services/sync/*, src/types/domain.ts, src/constants/index.ts, src/services/audio-path.ts（架构师 Phase 1 已落地，本 Spec 锁定其为真源）

---

## 1. 产品定义
- **一句话描述**：一个不打扰、不掉线、不丢数据、把 N1 四大技能装进一处的本地优先个人冲刺台。
- **目标用户**：25-35 岁在职/在校 N1 冲刺者，中级偏上日语基础，备考周期 1-3 个月，碎片+整块时间混合。
- **核心问题**：市面无「零广告、离线可用、数据不丢、四技能一体、开箱即用」的个人 N1 工具；现有资产（200 例文/200 听解/30 读解 + TTS + localStorage）正好填坑。

## 2. MVP 范围（锁定——不在此列表的功能一律不做）

| 优先级 | 功能 | 验收标准摘要 | 来源 |
|--------|------|-------------|------|
| P0 | Vue 3 组件化重构，1:1 保留 7 模块 | 全部功能等价旧版，分层架构，单文件≤300行 | 总纲 |
| P0 | 数据层抽象（Repository/SyncAdapter） | 业务层只依赖 SyncAdapter 抽象，零硬编码 localStorage | PRD |
| P0 | 本地持久化（localStorage） | 刷新/重开进度/错题/收藏/设置完整保留 | PRD |
| P0 | 云同步接口抽象层（定义+本地实现，不接后端） | SyncAdapter 契约落地，RemoteAdapter 空壳，将来换一行 adapter 零改业务 | PRD |
| P0 | 导入/导出 JSON 备份 | 导出全量快照下载；导入合法 JSON 完整还原；非法 JSON 拒绝 | PRD |
| P0 | 错题本（错题驱动复习） | 答错进错题；连续答对 3 次视为掌握不再推送 | PRD |
| P0 | 听解题库 + 播放器 | 逐句定位/变速 0.75·1.0·1.25/原文切换；真人音频缺失回退 TTS | PRD+Design |
| P0 | 设计系统重做（tokens + 组件 + 深色模式） | 四层 Token 双主题；Lucide 图标；P0 自检 0 违规 | PRD+Design |
| P1 | 题型训练（分区练习） | 模式卡→单题流；键盘 1-4；解析 slide-down | PRD |
| P1 | 学习台首页 | 4 指标卡 + 今日任务 + 下一步 CTA + 题型正确率 | PRD |
| P1 | 文法词汇 | 200 例文：检索+高亮+收藏+音频 | PRD |
| P1 | 读解题库 | 30 篇：明朝体长文 + 设问；統合理解 A/B 并排 | PRD+Design |
| P1 | 考试策略 | 6 策略卡纯阅读 | PRD |
| P1 | 轻量进度统计 | 掌握度 + 趋势可视化（本地不外传） | PRD |
| P2 | 字号调节 | 设置内调节，刷新保留，全站生效 | Design 副产品 |

## 3. 明确不做（Out-of-Scope — 锁定）

| 不做的功能 | 原因 | 何时考虑 |
|------------|------|----------|
| 账号/登录/后端服务 | 本阶段明确无后端；仅预留 SyncAdapter 扩展位 | 用户要求云同步落地时 |
| 云同步真落地（连服务器） | 本阶段只定义接口+本地实现，避免过度工程 | v2 接 RemoteAdapter |
| 社交/排行榜/在线模考 | 单人本地工具；强绑联网，违「本地优先/离线」 | 产品定位转变时 |
| AI 智能出题/内容生成 | 策展内容够用；引入模型有成本 | 内容生产瓶颈时 |
| 原生 App / 多端同步 | 本阶段只本地 Web SPA | 有移动端诉求时 |
| 支付/会员/付费墙 | 无商业化诉求；「零广告零付费墙」是差异化 | 商业模式明确时 |
| 真人录音替换 TTS | 制作成本高；TTS 满足冲刺 | 体验升级期 |
| 推送/提醒/每日打卡 | 本地无推送通道；非核心 | Backlog |
| N2-N5 多级别 | 聚焦 N1，防范围蔓延 | 用户扩级时 |

## 4. 技术架构（锁定 — 含版本锚定）

| 层 | 技术 | 实际版本 | 锁定原因 |
|----|------|----------|----------|
| 前端框架 | Vue | 3.5.40 | 组件化基座；3.6 Vapor 仍 beta 不用 |
| 构建工具 | Vite | ^7.3 | 快；SPA 足够，不需 Nuxt SSR |
| Vue 插件 | @vitejs/plugin-vue | ^6 | 配套 |
| 语言 | TypeScript | ~5.9 | strict 模式，类型即契约 |
| 类型检查 | vue-tsc | ^2.2 | SPA 类型门禁 |
| 状态 | Pinia | ^3.0.4 | 轻量；**不引 persistedstate**（绕过同步抽象） |
| 路由 | vue-router | ^4.6.4 | 7 视图路由 |
| 测试 | Vitest | ^3 | 单测 services（audio-path/content-service/adapter） |
| 图标 | lucide-vue-next | ^1.0.0 | 经 AppIcon 白名单唯一出口，禁 emoji/混用 |
| 字体 | 自托管 woff2 | — | **离线可用**，不由 CDN 提供（用户裁决） |
| 部署 | 本地 http.server / vite preview | — | 本阶段不部署 |

## 5. 内部契约 / API 端点清单（锁定——开发时以此为唯一依据）

本阶段无网络 REST API。业务↔存储的唯一契约是 `SyncAdapter`（src/services/sync/types.ts）：

| Method | 语义 | 参数 | 返回 | 说明 |
|--------|------|------|------|------|
| `init()` | 打开存储/校验 schema/迁移 | — | Promise<void> | app 挂载前调用 |
| `pull()` | 拉取权威快照 | — | Promise<SyncResult> | 本地读 STORE_KEY→迁移；失败回退默认态 |
| `push(state)` | 写入整份 UserState | UserState | Promise<SyncResult> | last-write-wins；revision 自增 |
| `subscribe(cb)` | 订阅外部变更 | (r:SyncResult)=>void | ()=>void | 本地监听 storage 事件跨标签页 |
| `clear()` | 清空用户状态 | — | Promise<void> | 重置/登出预留 |

未来云同步端点（仅定义，本期不实现）见 `openapi.yaml`：GET/PUT/DELETE `/api/v1/state`，SSE `/api/v1/state/stream`。

内容归一化（content-service，Phase 3 实现）：
- 听解 `answer` 已是 0-based，直接用
- 读解 JSON `answer` 是 1-based，`content-service` 统一转 0-based
- 业务层拿到的永远是 0-based 选项下标

## 6. 数据模型（锁定）

### 6.1 用户状态（localStorage，key=`n1-center-v1`，+ `schemaVersion`）
```ts
interface UserState {
  schemaVersion: number;
  answers: Record<string, AnswerRecord>;   // key = `${kind}:${id}` 或 `${kind}:${id}:${sub}`
  favorites: Record<string, FavoriteRecord>;
  daily: Record<string, DailyRecord>;       // key = YYYY-MM-DD
  settings: Settings;
}
interface AnswerRecord { kind:'listening'|'reading'|'example'; id:number; sub?:number; correct:boolean; chosen:number; meta:{type:string;title?:string}; at:number }
interface FavoriteRecord { kind:string; id:number; at:number }
interface DailyRecord { done: Record<string, boolean>; tasks: Record<string, boolean> }
interface Settings { dailyTarget:number; volume:number; theme:'light'|'dark'; fontSize:number; playbackRate:number }
```

### 6.2 内容数据（静态，动态 import 懒加载）
- `EXAMPLES`（n1_examples.json / data.js）：`{id, jp, cn, grammar, vocab}`
- `LISTENING`：`{id, type, script, question, options[], answer(0-based), explanation}`
- `READINGS`：`{type, title, content|contentA+contentB, questions:[{question, options[], answer(1-based→归一0-based)}]}`

### 6.3 音频路径（不可改，全走 src/services/audio-path.ts）
- 例文：`audio/${id padded4}.mp3`
- 听解：`listening_audio/${id padded4}.mp3`
- 选项：`option_audio/listening/${id padded4}_${i}.mp3` / `option_audio/reading/${articleIdx padded4}_${qIdx}_${i}.mp3`
- 读解无 id，用数组下标（文件名+1）；**源数组顺序不可排序**

## 7. 页面清单（锁定）

| 页面 | 路由 | 核心组件 | 对应数据 | 设计 Token 主题 |
|------|------|----------|----------|-----------------|
| 学习台 | /dashboard | MetricCard / TaskList / TypeAccuracy | answers/daily/settings | 浅色默认，深色可选 |
| 题型训练 | /train | ModeCard / QuestionFlow / Explanation | LISTENING+READINGS | 同上 |
| 文法词汇 | /examples | SearchBar / ExampleRow / AudioBtn | EXAMPLES | 同上 |
| 听解题库 | /listening | TypeTabs / ListeningCard / AudioPlayer | LISTENING | 同上 |
| 读解题库 | /reading | TypeTabs / ReadingArticle / QuestionBlock | READINGS | 同上 |
| 错题本 | /review | FilterTabs / ReviewItem / ErrorNote / ClearModal | answers(filtered) | 同上 |
| 考试策略 | /strategy | StrategyCard×6 | 静态内容 | 同上 |

## 8. 设计 Token（锁定）

> canonical 运行时路径：`src/styles/tokens.css`（逐字拷贝自设计源 `design-system/tokens.css`）。结构类用 `--space-*`/`--radius-*`/`--text-*`。

- **主色** `--color-primary: #173F4D`（深青 ink-sea，白字 AAA 对比，沿用旧版基线）
- **背景** `--color-bg: #F7F8F6`（冷调纸白，非奶油米色）
- **文字** `--color-text: #1A2420`（墨色，15:1）
- **语义色**：正解 `--color-success: #2E7D5B`；错误 `--color-danger: #C0392B`（印章感）；提示 `--color-warn`（琥珀）
- **字体**（多脚本分工，自托管 woff2）：日文 UI/例文/题干 Noto Sans JP；读解长文正文 **Noto Serif JP 明朝体**；中文 Noto Sans SC；UI 拉丁 Inter；数字 JetBrains Mono
- **字号**：例文 18px/1.85；读解 16px/1.95；中文更大行高
- **间距** 4px 网格（密度7 主用 12/16）；**圆角** sm6/md10/lg14/pill；**阴影** 优先 1px 边框，浮层才用阴影
- **图标** Lucide（`lucide-vue-next`），stroke 2，尺寸 16/20/24，全项目唯一经 `AppIcon.vue` 出口，零 emoji
- **主题** 浅色默认 + 深色（`data-theme` 覆盖），设置持久化
- **答题反馈三重编码** = 图标 + 文本 + 颜色（色盲可达）
- **P0 自检**：emoji 0 命中、无紫粉渐变、无裸 hex（仅 #fff/#000 例外）、无空洞占位文案

## 9. 验收标准（锁定——QA 测试时以此为唯一依据，EARS 格式）

| 编号 | 功能 | EARS 格式验收标准 | 优先级 |
|------|------|-------------------|--------|
| AC-01 | 答题记录 | When 用户答任一题，系统**必须**记录 answer 并写入 UserState | P0 |
| AC-02 | 错题进入 | If 答错，系统**必须**将该题加入错题本并在复习优先出现 | P0 |
| AC-03 | 掌握判定 | While 某题连续答对 ≥3 次，系统**应该**不再于复习中推送该题 | P0 |
| AC-04 | 持久化 | When 刷新/关闭重开，系统**必须**完整恢复进度/错题/收藏/设置 | P0 |
| AC-05 | 导入导出 | When 用户点导出，系统**必须**下载全量 JSON；When 导入合法 JSON，系统**必须**完整还原；If 非法 JSON，系统**必须**拒绝并提示 | P0 |
| AC-06 | 听解播放器 | When 播放听解题，系统**必须**支持逐句定位、变速(0.75/1.0/1.25)、原文显示切换 | P0 |
| AC-07 | 依赖倒置 | When 业务层调用数据接口且将来 RemoteAdapter 替换 LocalStorageAdapter，系统**必须**业务代码零改动 | P0 |
| AC-08 | 偏好持久 | When 用户切深色模式/调字号，刷新后系统**必须**保留且全站生效 | P1 |
| AC-09 | 音频降级 | If 真人音频加载失败，系统**必须**回退 TTS + toast 提示 | P0 |
| AC-10 | 离线字体 | When 离线打开应用，系统**必须**用自托管 woff2 渲染（不依赖 CDN） | P0 |
| AC-11 | P0 规则 | While 渲染任意 UI，系统**必须**不使用 emoji 图标、不硬编码颜色、不出现紫粉渐变 | P0 |

## 10. 边界与约束
- 不支持 IE；兼容 Chrome/Safari/Firefox 最新 2 版
- 响应式断点：桌面 rail 侧栏；移动底部 TabBar 5 项（<960px）
- 性能：本地首屏 <2s，路由切换 <200ms，音频起播 <500ms
- 加载态：题库/音频骨架屏；错误态：音频失败降级 TTS；localStorage 写满/禁用降级提示
- 导入非法 JSON 校验拒绝；题目数据缺失容错渲染
- 单文件 ≤300 行（ESLint max-lines 强制）；main.ts 只装配
- 可访问性：WCAG 2.1 AA 基线（键盘可达 + 对比度 + 字号调节）
- 隐私：所有学习行为数据仅存本地、不外传

## 11. 内嵌已知坑（从项目记忆/旧版提炼，防重蹈）

| 坑 | 技术栈指纹 | 根因 | 修法 |
|----|------------|------|------|
| 音频编号错配 | audio-path | 手写路径易错位 | 全走 src/services/audio-path.ts，禁硬编码 |
| 读解顺序依赖 | data.js READINGS | 读解无 id 用数组下标，排序会错位 | 源数组禁排序；content-service 用原序 |
| answer 基线不一 | LISTENING/READINGS | 听解 0-based、读解 1-based | content-service 统一转 0-based |
| 旧用户数据丢失 | localStorage | 换 key 不兼容 | 保 STORE_KEY='n1-center-v1' + schemaVersion 迁移 |
| persistedstate 绕过抽象 | pinia | 插件直写 localStorage | 不引入，持久化只经 stores→SyncAdapter |

## 12. 端到端验证步骤（Spec 锁定的最后一项）

```bash
# 1. 安装
npm install
# 2. 类型检查 + 单测（先验证 services 契约）
npm run typecheck && npm run test
# 3. 构建
npm run build
# 4. 本地启动
npm run dev   # 等待 "Local: http://localhost:5173"
# 5. 核心成功流
#    - 打开 /listening，播一题，变速 0.75，答错 → 进错题本
#    - /review 看到该题；连对 3 次后不再推送
#    - 刷新页面 → 进度/错题/设置完整保留
#    - 点导出 → 下载 JSON；清空 localStorage 后导入 → 完整还原
# 6. 关键错误流
#    - 断网打开 → 字体仍渲染（自托管 woff2），功能可用
#    - 删 audio 文件 → 播放回退 TTS + toast
# 7. 依赖倒置验证
#    - main.ts 将 LocalStorageAdapter 换成 RemoteAdapter 占位 → 业务层零改动（抛 NotImplemented 属预期）
```

## 13. 变更记录
| 日期 | 变更内容 | 原因 | 影响范围 |
|------|----------|------|----------|
| 2026-08-01 | Spec v1.0 生成 | Phase 1 三文档确认 + 4 项裁决（导出导入/掌握阈值3/倍速/自托管字体） | 全项目 |
