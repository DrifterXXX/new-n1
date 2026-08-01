# JLPT N1 备考中心 — Vue 3 重构架构文档

版本: 1.0.0 (Route B 重构) | 作者: 高见远(架构) | 日期基线: 2026-07-31
适用范围: 本地优先纯前端 SPA，无后端、无部署，为将来接入账号/云同步预留零改动接口层。

---

## 0. 约束回顾 (P0 绝对规则)

- 文档与代码中禁止使用 emoji 作为功能图标。
- 图标统一走一套锁定的 SVG 图标库(Lucide)，全项目不混用其他图标源。
- 禁止硬编码颜色，全部走 Design Token(`src/styles/tokens.css` CSS 变量)。
- 单文件 ≤ 300 行(ESLint `max-lines` 强制)、单一职责、入口只装配、按资源分包。

---

## 1. 技术选型对比矩阵

评估维度权重(沿用团队决策矩阵)：学习成本(高)、生态成熟度(高)、部署成本(高)、扩展性(低)、团队熟悉度(高)、场景契合(本地优先/无后端)。评分 1-5，越高越好；带权综合。

| 维度 (权重) | A. Vue3+Vite+TS+Pinia+Router (SPA) | B. Nuxt 4 (Meta 框架) | C. Vue3 CDN 免构建 |
|---|---|---|---|
| 学习成本 (高 x3) | 4 | 3 | 5 |
| 生态成熟度 (高 x3) | 5 | 5 | 3 |
| 部署/运行成本 (高 x3) | 5 (纯静态/本地) | 3 (SSR 引入 Node 运行时，本项目用不到) | 5 |
| 扩展性 (低 x1) | 4 | 5 | 2 |
| 团队熟悉度 (高 x3) | 5 (框架已定 Vue 3) | 3 | 4 |
| 场景契合: 本地优先/无后端 (高 x3) | 5 (客户端渲染即可) | 2 (SSR/SEO 对本项目无价值，反增复杂度) | 3 (无类型/无模块化，难维护大数据) |
| 类型安全/可维护 (高 x3) | 5 (TS strict) | 5 | 2 (无 TS，data.js 全局变量) |
| **加权综合** | **约 4.8** | **约 3.6** | **约 3.4** |

结论: 选 **方案 A**。

选型理由：
1. 本项目是纯客户端、离线可用、无 SEO/无服务端数据获取需求，Nuxt 的 SSR/SSG/服务端数据加载能力全部用不上，反而引入 Node 运行时与部署复杂度，违背"恰到好处"。
2. Vue 3 已由项目决定；Vite 是 Vue 官方推荐构建工具，冷启动/HMR 最快，生态与 Vue 深度契合。
3. Pinia 是 Vue 官方状态库，TS 支持一流，恰好承载"业务层只依赖抽象存储"的分层要求。
4. TypeScript strict 把当前 data.js 全局变量式代码升级为可维护、可契约化的类型系统，是从单文件走向组件化的地基。

被否决项说明：
- 方案 B (Nuxt 4)：过度设计。SSR 对备考工具无收益，且需要 Node 运行环境，和"无后端、无部署"目标冲突。
- 方案 C (CDN 免构建)：临时方案。无 TS、无模块化、无 tree-shaking，题库数据(约 800KB+ JSON)与音频交互逻辑规模已超出裸 HTML 可维护上限，正是本次重构要摆脱的形态。

---

## 2. 锁定技术栈与稳定版本 (2026-07-31 核实)

来源: vuejs.org/about/releases、Vite 官方、npm/npmmirror。

| 类别 | 库 | 锁定版本 | 说明 |
|---|---|---|---|
| 框架 | vue | 3.5.40 | 当前稳定版。3.6(Vapor)仍为 beta，MVP 不使用。 |
| 构建 | vite | ^7.3.0 | v8 尚在迭代未定稿，锁 v7。 |
| Vue 插件 | @vitejs/plugin-vue | ^6.0.0 | 与 Vite 7 匹配。 |
| 状态 | pinia | ^3.0.4 | Pinia 3，仅支持 Vue 3。 |
| 路由 | vue-router | ^4.6.4 | 支持类型化路由。 |
| 语言 | typescript | ~5.9 (pin 最新 5.x) | strict 模式。 |
| 类型检查 | vue-tsc | ^2.2.0 | 与 vue 3.5 匹配，配合 `tsc --noEmit`。 |
| 图标(锁定) | lucide-vue-next | ^1.0.0 | 唯一 SVG 图标源，全项目统一，禁止混用。ISC 许可，tree-shakeable。 |
| 测试 | vitest | ^3.0.0 | 单元测试(纯函数/store/adapter)。 |
| Lint | eslint + eslint-plugin-vue | ^9.x / ^9.x | 强制 `max-lines: 300`。 |

图标库决策(锁定 Lucide)：
- 单一来源、统一 24x24 stroke 风格，天然满足"不混用"。
- `lucide-vue-next` 为 Vue 3 官方实现，按需导入可 tree-shaking。
- 通过唯一封装组件 `components/common/AppIcon.vue` 白名单式再导出图标，禁止业务组件直接从 `lucide-vue-next` 引入，从工程上杜绝混用与 emoji。

明确不引入：`pinia-plugin-persistedstate`。原因：持久化必须经由 SyncAdapter 抽象层，若用持久化插件直写 localStorage，将绕过抽象、破坏"将来接后端业务零改动"的核心目标。

---

## 3. 项目目录结构 (分层，依赖只向下)

```
n1-study-center/
├── public/                         # 静态资源(原样保留, Vite 不处理)
│   ├── audio/                      # 例文音频 0001.mp3 ...
│   ├── listening_audio/            # 听解音频 0001.mp3 ...
│   └── option_audio/
│       ├── listening/              # 0001_1.mp3 (题号_选项号)
│       └── reading/                # 0001_1_1.mp3 (篇号_设问号_选项号)
├── src/
│   ├── main.ts                     # 入口: 装配 app/pinia/router/sync 后挂载, 不含业务
│   ├── App.vue                     # 根组件: 仅 <RouterView> + 全局 Toast 宿主
│   ├── router/
│   │   └── index.ts                # 路由表(7 视图 + 默认重定向 dashboard)
│   ├── layouts/
│   │   └── AppShell.vue            # 侧栏导航 + 顶栏(音量/继续训练/今日20题) + <RouterView>
│   ├── views/                      # 页面级(与导航 7 项一一对应)
│   │   ├── DashboardView.vue        # 学习台
│   │   ├── TrainView.vue            # 题型训练
│   │   ├── ExamplesView.vue         # 文法词汇
│   │   ├── ListeningView.vue        # 听解题库
│   │   ├── ReadingView.vue          # 读解题库
│   │   ├── ReviewView.vue           # 错题本
│   │   └── StrategyView.vue         # 考试策略(静态)
│   ├── components/
│   │   ├── common/                 # 纯展示组件(props/emits, 不依赖 store/service)
│   │   │   ├── AppIcon.vue           # 唯一图标出口(Lucide 白名单)
│   │   │   ├── BaseButton.vue
│   │   │   ├── MetricCard.vue
│   │   │   ├── Pager.vue
│   │   │   ├── FilterTabs.vue
│   │   │   ├── VolumeControl.vue
│   │   │   └── ToastHost.vue
│   │   ├── question/               # 题目功能组件(可用 store/composable)
│   │   │   ├── OptionList.vue        # 选项 + 选项音频 + 答题着色
│   │   │   ├── ListeningCard.vue     # 听解题卡(听/原文/收藏/解析)
│   │   │   ├── ReadingArticle.vue    # 读解文章(含統合双文) + 设问
│   │   │   └── ExampleRow.vue        # 例文行(再生/收藏)
│   │   └── dashboard/
│   │       ├── DailyTasks.vue
│   │       └── TypeAccuracyPanel.vue
│   ├── composables/                # Vue 逻辑复用
│   │   ├── useAudioPlayer.ts         # 单例音频元素 + TTS 回退 + 音量联动
│   │   ├── usePagination.ts
│   │   └── useToast.ts
│   ├── stores/                     # 业务状态(Pinia)
│   │   ├── user.ts                   # 持久化引擎: 拥有 UserState, 唯一调用 SyncAdapter
│   │   ├── progress.ts               # 答题记录/正确率/错题回收
│   │   ├── favorites.ts              # 收藏
│   │   ├── daily.ts                  # 每日任务/完成计数
│   │   ├── settings.ts               # 音量/每日目标
│   │   ├── session.ts                # 训练会话(内存态, 不持久化)
│   │   └── content.ts                # 题库内容(只读)加载 + 筛选/分页选择器
│   ├── services/                   # 基础设施(纯 TS, 无 Vue 依赖)
│   │   ├── sync/
│   │   │   ├── types.ts              # SyncAdapter / UserState / SyncResult 契约(唯一真源)
│   │   │   ├── index.ts             # initSync / getSyncAdapter 单例
│   │   │   ├── local-storage-adapter.ts  # 默认实现(读写 n1-center-v1)
│   │   │   ├── remote-adapter.ts     # 占位实现(throw NotImplemented)
│   │   │   └── migrations.ts         # schemaVersion 迁移
│   │   ├── content-service.ts        # 加载 + 规范化题库(补 reading id、answer 归一 0-based)
│   │   └── audio-path.ts             # 音频路径纯函数(保持与旧版完全一致的编号规则)
│   ├── data/                       # 题库 JSON(只读内容, 从 data.js 拆分而来)
│   │   ├── examples.json             # EXAMPLES
│   │   ├── listening.json            # LISTENING
│   │   └── readings.json             # READINGS
│   ├── types/
│   │   └── domain.ts                 # Example/Listening/Reading/AnswerRecord/... 领域类型
│   ├── styles/
│   │   ├── tokens.css                # Design Token(CSS 变量), 唯一颜色来源
│   │   └── base.css                  # reset + 全局排版
│   └── constants/
│       └── index.ts                  # STORE_KEY / PER_PAGE / 题型枚举 / 路由名
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── openapi.yaml                     # 未来云同步 REST 契约(v1) sidecar
└── docs/
    ├── ARCHITECTURE.md
    └── decisions/                   # ADR
        ├── ADR-001-framework-stack.md
        ├── ADR-002-sync-adapter-abstraction.md
        └── ADR-003-icon-library-lucide.md
```

### 3.1 分层依赖规则 (强制，单向向下)

```
views  ──▶ layouts / components / composables / stores / constants / types
components/common ──▶ composables(仅 UI) / constants / types      [禁止 import stores/services]
components/{question,dashboard} ──▶ common / composables / stores / constants / types
composables ──▶ stores / services / constants / types
stores ──▶ services / constants / types                           [禁止 import components/views]
services ──▶ constants / types                                    [纯 TS, 禁止 import vue/stores]
types / constants ──▶ (叶子, 不 import 任何内部模块)
```

关键红线：
- 业务层(stores)只依赖 `services/sync/types.ts` 的抽象 `SyncAdapter`，绝不 import 具体 adapter。具体实现由 `main.ts` 装配注入。
- `services/` 保持纯净(无 Vue、无 Pinia)，可被单测直接覆盖。
- 图标只经 `AppIcon.vue`；颜色只经 `tokens.css`；持久化只经 `user.ts` → `SyncAdapter`。

---

## 4. 云同步接口抽象层 (核心交付)

设计目标：业务层(stores/组件)对"数据存在哪里"完全无感。今天存 localStorage，明天存后端，业务代码零改动——只在 `main.ts` 换一行 adapter。

### 4.1 数据边界

- **内容数据(只读)**: EXAMPLES/LISTENING/READINGS。不属于同步范围，由 `content-service` 作为静态资源加载。
- **用户数据(需同步)**: `answers / favorites / daily / settings`，聚合为单一 `UserState`。SyncAdapter 只负责 UserState。

### 4.2 接口契约 (`SyncAdapter`)

完整 TypeScript 契约见 `src/services/sync/types.ts`(随本交付创建)。核心签名与语义：

```typescript
interface SyncResult {
  state: UserState;     // 快照
  revision: number;     // 单调递增版本号, 用于将来冲突检测(乐观锁)
  syncedAt: number;     // epoch ms
}

interface SyncAdapter {
  readonly name: string;                                   // 诊断标识
  init(): Promise<void>;                                    // 打开存储/校验 schema/跑迁移
  pull(): Promise<SyncResult>;                              // 拉取权威快照
  push(state: UserState): Promise<SyncResult>;             // 写入(MVP: last-write-wins), 返回带新 revision 的快照
  subscribe(onChange: (r: SyncResult) => void): () => void; // 订阅外部变更, 返回取消函数
  clear(): Promise<void>;                                   // 清空(登出/重置)
}
```

设计要点(为何这样能保证零改动)：
1. **全部方法异步(Promise)**。localStorage 本是同步的，但契约从第一天就异步化——这样业务层的调用形态(await)不会因将来换成网络请求而改变。这是"零改动"的关键。
2. **pull/push 以整份 UserState 为单位**。MVP 用 last-write-wins，最简且够用；`revision` 字段先占位，将来后端可据此做乐观锁(If-Match)与冲突合并，届时只改 adapter 内部，不动业务。
3. **subscribe 抽象外部变更源**。LocalStorageAdapter 监听 `window 'storage'` 事件实现多标签页同步；RemoteAdapter 将来用 SSE/WebSocket 或轮询实现服务端推送——对业务层是同一个回调。
4. **业务层唯一入口是 `stores/user.ts`**：它 `pull()` 水合状态、深度侦听状态变化并防抖 `push()`、`subscribe()` 合并外部变更。其余 feature store(progress/favorites/daily/settings)只读写 `user.ts` 暴露的响应式切片，永不直接碰存储。

### 4.3 默认实现: LocalStorageAdapter

- 读写键 **`n1-center-v1`**(与旧版单文件应用一致)，保证现有用户本地进度**无缝迁移、不丢数据**。
- `pull()`: 读 + JSON.parse + `migrations` 补默认值/升级 schemaVersion；解析失败回退默认态。
- `push(state)`: JSON.stringify + 写入，`revision` 自增并存于 state；同步操作包 `Promise.resolve`。
- `subscribe()`: 挂 `window.addEventListener('storage')`，同键变更时回调最新快照(跨标签页)。
- `clear()`: `localStorage.removeItem`。

### 4.4 占位实现: RemoteAdapter

- 全部方法先 `throw new Error('RemoteAdapter not implemented')`，并附对应 REST 端点注释。
- 未来实现映射(见 `openapi.yaml`)：
  - `pull()`  → `GET /api/v1/state`
  - `push()`  → `PUT /api/v1/state`(Header `If-Match: <revision>`, 409 冲突)
  - `subscribe()` → `GET /api/v1/state/stream`(SSE) 或轮询
  - `clear()` → `DELETE /api/v1/state`
- 装配切换(将来)：`main.ts` 中 `const adapter = import.meta.env.VITE_SYNC_MODE === 'remote' ? createRemoteAdapter(...) : createLocalStorageAdapter()`。

---

## 5. 核心功能技术可行性验证 (Vue 3 下)

| # | 功能 | 旧实现 | Vue 3 方案 | 结论 |
|---|---|---|---|---|
| 1 | 音频播放(edge-tts MP3) | `new Audio()` 全局单例 | `useAudioPlayer` 组合式函数持有单例 `HTMLAudioElement`，音量绑 settings store；路径由 `audio-path.ts` 纯函数生成 | 可行, 行为等价 |
| 2 | 选项 TTS 回退 | `SpeechSynthesisUtterance` lang=ja-JP | 同上封装在 `useAudioPlayer.speak()`，MP3 缺失时降级；`beforeunload`/组件卸载时 `speechSynthesis.cancel()` | 可行(浏览器 TTS 可用性差异保持优雅降级) |
| 3 | 答题记录 | `store.answers[kind:id:sub]` | `progress` store 写入 `user.ts` 的响应式 `answers`，深度侦听防抖持久化 | 可行 |
| 4 | 错题回收 | 过滤 `!correct` | `progress` getter `wrongList`；`clearWrong()` action | 可行 |
| 5 | 每日任务 | `store.daily[YYYY-MM-DD]` | `daily` store，`todayKey()` 工具；任务勾选/重置 action | 可行 |
| 6 | 收藏 | `store.favorites[kind:id]` | `favorites` store，`isFav/toggleFav` | 可行 |
| 7 | 训练会话(混合/薄弱/错题) | 内存 `state.session` | `session` store(不持久化)，`buildPool` 从 content + progress 组池 | 可行 |
| 8 | 搜索/分页/题型筛选 | 命令式重渲染 | `content` store 选择器 + `usePagination`，Vue 响应式自动更新 | 可行, 显著简化 |

### 5.1 必须保留的数据完整性约束 (全团队遵守)

1. **音频编号规则不变**(否则音频 404)：
   - 例文: `/audio/{pad4(id)}.mp3`
   - 听解: `/listening_audio/{pad4(id)}.mp3`
   - 听解选项: `/option_audio/listening/{pad4(id)}_{optIdx+1}.mp3`
   - 读解选项: `/option_audio/reading/{pad4(readingIndex+1)}_{subIdx+1}_{optIdx+1}.mp3`
   - `id` 定义：例文/听解用数据自带 `id`(1 起)；读解无 id，**用数组下标**，文件名再 +1。
   全部路径统一走 `services/audio-path.ts`，前缀用 `import.meta.env.BASE_URL`。
2. **读解需补稳定 id**：READINGS 无 id，`content-service` 加载时以数组下标注入 `id`，且**源数组顺序不可变更/不可排序**，因为 `answers` 以下标为键。将来接后端时读解须补真实主键(见 ADR-002 迁移注记)。
3. **answer 归一化**：听解 `answer` 为 0-based；读解 JSON 的 `answer` 为 1-based。`content-service` 统一转成 **0-based**，组件层不再各自 -1。
4. **answerKey/favKey 格式不变**：`answerKey = kind:id[:sub]`，`favKey = kind:id`，与旧版一致以复用既有 localStorage 数据。
5. **STORE_KEY 保持 `n1-center-v1`**，并新增 `schemaVersion` 字段用于将来迁移。

---

## 6. 构建 / 开发工具链

### 6.1 vite.config.ts 要点

- 插件: `@vitejs/plugin-vue`。
- 别名: `@` → `/src`。
- `base: '/'`(经 dev server / preview 运行)。若需 `file://` 直开 dist，则改 `base: './'`。
- 音频/题库大文件放 `public/`，构建不处理、原样拷贝；引用统一加 `import.meta.env.BASE_URL` 前缀。
- 题库 JSON 可按视图动态 `import()` 懒加载，避免首屏打包过大。

### 6.2 tsconfig 要点

- `strict: true`、`noUncheckedIndexedAccess: true`(answers/favorites 为 Record，索引访问需判空)、`paths` 配 `@/*`。
- 类型检查用 `vue-tsc --noEmit`(纳入 CI/预提交)。

### 6.3 单文件 ≤300 行约束落地

- ESLint 规则 `max-lines: ['error', { max: 300, skipBlankLines: true, skipComments: true }]`。
- `.vue` 文件同样计入(template+script+style 合计)；超限即拆分子组件/composable。
- `main.ts` 只做装配(create app、use pinia/router、initSync、mount)，不含业务逻辑。

### 6.4 本地启动

```bash
npm install            # 或 pnpm install
npm run dev            # http://localhost:5173  (HMR 开发)
npm run build          # 产物输出 dist/
npm run preview        # 本地静态预览 dist/
npm run type-check     # vue-tsc --noEmit
npm run lint           # eslint(含 max-lines)
npm run test           # vitest(纯函数/store/adapter 单测)
```

### 6.5 package.json scripts(建议)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview",
    "type-check": "vue-tsc --noEmit",
    "lint": "eslint . --ext .vue,.ts",
    "test": "vitest"
  }
}
```

---

## 7. 迁移步骤建议(给前端实现者)

1. `npm create vite@latest` 选 vue-ts 模板，对齐第 2 节版本。
2. 把 `audio/ listening_audio/ option_audio/` 移入 `public/`。
3. 拆 `data.js` 的三个全局数组为 `src/data/*.json`。
4. 落地 `types/domain.ts`、`services/sync/*`(契约已随本交付给出)、`services/content-service.ts`、`services/audio-path.ts`。
5. 建 `stores/user.ts`(持久化引擎)，再建 feature stores。
6. 拷 `design-system/tokens.css` 到 canonical 运行时路径 `src/styles/tokens.css`(逐字一致，勿改)，在 `main.ts` import。
7. 逐视图迁移组件，保持 ≤300 行、走 AppIcon 与 tokens。
8. `vitest` 覆盖 `audio-path`、`content-service`(归一化)、`local-storage-adapter`(迁移/回退)。

---

## 8. Design Token 与图标契约 (与 designer 对齐定稿, 2026-08-01)

本节把设计系统的共享契约锁进架构约束。**canonical 源** = `design-system/tokens.css`(designer 维护)，**运行时路径** = `src/styles/tokens.css`(逐字拷贝)。完整视觉规范见 `design-system/MASTER.md`。

### 8.1 颜色 Token (强制唯一来源)

- 组件禁止硬编码颜色，一律 `var(--color-*)`；唯一允许的裸色 = `#fff` / `#000`。
- 命名前缀锁定：颜色 `--color-*`；结构类 `--space-* / --radius-* / --text-* / --font-* / --leading-* / --motion-* / --elev-*`。
- 主色 `--color-primary: #173F4D`(沿用旧版基线，白字 ~10:1 AAA)。答题反馈 `--color-success / --color-danger`(取旧版 correct/wrong)。
- 暗色主题：`:root[data-theme="dark"]` 覆盖同名变量(primary 提亮 `#4DB3AC`、primary-on 翻 `#06231F`)。主题切换只切 `data-theme` 属性，不改组件。
- 关键变量族(完整清单以 `tokens.css` 为准)：
  - 中性: `--color-bg / -surface / -surface-2 / -text / -text-2 / -text-muted / -text-meta / -border / -border-soft / -border-strong`
  - 主色: `--color-primary / -primary-hover / -primary-active / -primary-on / -primary-soft / --color-focus-ring`
  - 语义: `--color-success{,-soft,-strong} / --color-danger{,-soft,-strong} / --color-warn{,-soft}`
  - 结构: `--space-1..16`(4px 网格) / `--radius-sm|md|lg|pill` / `--text-xs..3xl` / `--elev-flat|ring|raised|overlay` / `--motion-fast|base|slow` + `--ease`
  - 布局: `--sidebar-w:248px` / `--sidebar-rail-w:64px` / `--container-max:1160px` / `--tap-min:44px`

### 8.2 字体 (多脚本分工) — 需 team-lead 裁决体积

- `--font-jp`(Noto Sans JP): 日文 UI/例文/题干/选项
- `--font-reading`(Noto Serif JP 明朝体): **仅读解长文正文** → `ReadingArticle.vue` 的 `.reading-box` 用此，其余日文用 sans
- `--font-cn`(Noto Sans SC): 中文译文/说明；`--font-mono`: 仪表盘数字
- advisory: 多套 Google Fonts @import 有首屏体积成本。建议按脚本 `subset` + `display=swap`，或自托管 woff2 + `unicode-range` 分包。最终由 team-lead 拍板体积预算。

### 8.3 图标白名单 (AppIcon.vue 唯一出口，可直接固化)

- 锁定 `lucide-vue-next` ^1.0.0，stroke 2，尺寸 16/20/24，`color=currentColor`(随文字 token)。
- 业务组件禁止直接 import `lucide-vue-next`，一律经 `AppIcon`；ESLint `no-restricted-imports` 拦截。零 emoji。
- 白名单(与 `design-tokens.json` 的 `icons` 字段同款，PAGE-SPECS 全量引用锁定)：
  - nav(7): `layout-dashboard, dumbbell, book-open, headphones, file-text, rotate-ccw, target`
  - audio: `play, pause, volume-2, volume-x, gauge, loader`
  - feedback: `check, circle-check, x, circle-x, circle, info`
  - action: `bookmark, search, chevron-down, chevron-up, arrow-right, arrow-left, refresh-cw, trash-2, ellipsis, sun, moon, settings-2, pencil, arrow-up, download, upload`
  - pager: `chevron-left, chevron-right, chevrons-left, chevrons-right`
  - dashboard-metric(可选前缀): `check-circle, layers, percent`
  - strategy(可选前缀): `calendar, clock, flag`
- 旧版文字钮映射：听→`play/pause`+`volume-2`、收藏→`bookmark`、再生→`play`、原文→`chevron-down/up`、清空→`trash-2`、重置→`refresh-cw`、主题→`sun/moon`。

### 8.4 布局与响应式 (AppShell.vue)

- 左 248px(`--sidebar-w`)固定导航 + 右主区(顶栏: 音量 / 继续训练 / 今日20题 / 主题切换 sun-moon / 听解页倍速位 + `<RouterView>`)。
- 导航仍 7 路由不变；视觉上可分 4 组(学习/题库/复盘/指南)加分组细标签，纯展示层，不影响路由表。
- 响应式(实现按 `MASTER.md §8`)：`<768px` 左栏收成 64px 图标轨(`--sidebar-rail-w`)或转底部 TabBar(5项)。此为渐进增强，不改分层与 store。

---

## 9. Phase 2 详细设计 (2026-08-01, 作者: 高见远)

范围: 3 个规格 + 1 处 schema 修正。均落在 `services/` 纯 TS 层(无 Vue/无 Pinia)，可被 vitest 直接覆盖。P0 规则(禁 emoji / 颜色只经 tokens.css / 图标只经 AppIcon)在本节全部生效——本节仅涉及数据/服务层，天然不引入任何 UI 违规源。

### 9.1 content-service 归一化模块规格 (`src/services/content-service.ts`)

职责边界: **加载只读题库 → 归一化 → 冻结成 `ContentBundle`**。归一化是**一次性的加载期动作**(loadContent 内发生一次)，业务层拿到的 `answer` 永远是 0-based，组件层严禁再 `-1`(防 Spec §11「answer 基线不一」坑)。

#### 归一化规则(锁定)
| 内容 | 源 answer 基线 | 处理 | id 来源 |
|------|---------------|------|---------|
| 听解 LISTENING | **0-based**(数据源即 0-based) | 原样透传, 仅越界防御 | 数据自带 `id`(1 起) |
| 读解 READINGS | **1-based**(源 JSON) | **统一 -1 转 0-based** | 无 id → 注入数组下标(`id = index`, 文件名 = index+1) |
| 例文 EXAMPLES | 无 answer | — | 数据自带 `id`(1 起) |

红线: 读解源数组**顺序不可排序/不可变更**(`answers` 以下标为键, 排序即错位, Spec §11)。`normalizeReading` 严格保证 `id === 传入 index`。

#### 函数签名
```ts
// —— 源 JSON 原始结构(未归一, 内部类型) ——
interface RawReadingQuestion { question: string; options: string[]; answer: number } // answer 1-based
interface RawReading {
  type: string; title?: string;
  content?: string; contentA?: string; contentB?: string;
  questions: RawReadingQuestion[];
}

/**
 * 读解 answer 归一: 1-based → 0-based。
 * 容错(Spec §10「题目数据缺失容错渲染」): NaN / <1 / >optionCount 时钳制到 [0, optionCount-1] 并 console.warn, 不抛。
 * @param rawAnswer 源 JSON 的 1-based 值
 * @param optionCount 该设问选项数, 用于越界钳制
 * @returns 0-based 正确项下标
 */
export function normalizeReadingAnswer(rawAnswer: number, optionCount: number): number;

/** 单篇读解归一: 注入 id(=数组下标) + 每设问 answer 归一 0-based。源顺序不可变。 */
export function normalizeReading(raw: RawReading, index: number): Reading;

/** 听解归一: answer 已 0-based, 原样透传 + 越界防御(保持与读解一致的容错姿态)。 */
export function normalizeListening(raw: ListeningQuestion): ListeningQuestion;

/**
 * 加载并归一全部题库(动态 import 懒加载, 见 §6.1)。
 * examples.json / listening.json / readings.json → 归一 → 返回冻结 ContentBundle。
 * content store 只调用一次并缓存。
 */
export async function loadContent(): Promise<ContentBundle>;

/**
 * 按种类取题目列表(供 TrainView 组池、ReviewView 回填题干)。类型安全: 用重载精确返回。
 */
export function getQuestionsByKind(bundle: ContentBundle, kind: 'example'): Example[];
export function getQuestionsByKind(bundle: ContentBundle, kind: 'listening'): ListeningQuestion[];
export function getQuestionsByKind(bundle: ContentBundle, kind: 'reading'): Reading[];

/**
 * 单题定位(ReviewView 用 answerKey 反查题干): kind+id[+sub] → 题目/设问。
 * reading 传 sub 返回对应设问; 找不到返回 undefined(容错, 不抛)。
 */
export function getQuestion(
  bundle: ContentBundle, kind: ContentKind, id: number, sub?: number | null
): Example | ListeningQuestion | Reading | ReadingQuestion | undefined;
```

#### vitest 单测要点 (`content-service.spec.ts`)
1. **读解归一核心**: `normalizeReadingAnswer(1,4)===0`、`(2,4)===1`、`(4,4)===3`(逐条防「漏 -1 / 重复 -1」回归)。
2. **越界容错**: `(0,4)`、`(NaN,4)`、`(5,4)` → 钳制入 `[0,3]` 且触发 `console.warn`(用 `vi.spyOn(console,'warn')` 断言被调用, 不抛)。
3. **id 注入即下标**: `normalizeReading(raw, 7).id === 7`;`loadContent()` 后 `readings[0].id===0`、`readings[n-1].id===n-1`(**验证未排序**)。
4. **听解 0-based 不变**: 已知听解题 `normalizeListening(q).answer === q.answer`(证明听解**不**被二次 -1)。
5. **幂等性**: 对 `loadContent()` 结果再走 `getQuestionsByKind` 取值, `answer` 不再变化(归一只发生一次)。
6. **getQuestionsByKind 类型/引用**: 三种 kind 返回对应数组且元素结构正确(`reading[0].questions[0].answer` 为 0-based)。
7. **getQuestion 反查**: `getQuestion(bundle,'reading',3,1)` 命中第 3 篇第 2 设问;不存在的 id/sub 返回 `undefined`。
8. **統合理解结构**: 含 `contentA/contentB` 的读解归一后两字段保留、`content` 为 undefined(A/B 并排数据完整)。

---

### 9.2 导出/导入 JSON 快照函数规格 (`src/services/snapshot-service.ts`)

职责边界: 纯数据函数, **不碰 DOM**(下载/文件读取由 UI composable `useSnapshot.ts` 负责)。导出/导入均以 **SyncAdapter 抽象**为唯一数据通道 → 满足 AC-07 依赖倒置(将来换 RemoteAdapter 零改动)。落地 AC-05。

#### 数据流
- **导出** = `adapter.pull()` 拿整份 `UserState` → 包 `SnapshotEnvelope`(带元信息) → `JSON.stringify` → 交 UI 层触发下载。
- **导入** = `JSON.parse` → schema 校验 → `adapter.push(state)` 覆盖(last-write-wins) → 返回 `SyncResult`;**校验不过绝不 push**(不污染现有数据)。
- 信封设计: 导出带 `app/schemaVersion/exportedAt`, 便于将来跨版本兼容判定;导入**同时兼容**「信封」与「裸 UserState」两种输入(向后兼容手工/旧备份)。

#### 函数签名
```ts
/** 导出文件信封(带元信息)。 */
export interface SnapshotEnvelope {
  app: 'n1-center';        // = SNAPSHOT_APP_ID, 校验来源
  schemaVersion: number;   // 导出时的 SCHEMA_VERSION
  exportedAt: number;      // epoch ms
  state: UserState;
}

/** 结构化校验错误(供 UI toast 分类提示, Spec §10「导入非法 JSON 校验拒绝」)。 */
export class SnapshotError extends Error {
  code: 'INVALID_JSON' | 'SCHEMA_MISMATCH' | 'VERSION_UNSUPPORTED';
  constructor(code: SnapshotError['code'], message: string);
}

/** UserState 形状守卫(运行时校验必需字段/类型)。 */
export function validateUserState(value: unknown): value is UserState;

/** 导出: pull → 包信封 → 序列化。返回 JSON 字符串(下载交 UI 层)。 */
export async function exportSnapshot(adapter: SyncAdapter): Promise<string>;

/** 建议下载文件名: n1-center-backup-YYYYMMDD-HHmm.json。 */
export function snapshotFilename(now?: number): string;

/**
 * 解析 + 校验导入文本 → UserState。只解析不写入。
 * 非法 JSON → SnapshotError('INVALID_JSON'); schema 不符 → 'SCHEMA_MISMATCH';
 * schemaVersion 高于当前 → 'VERSION_UNSUPPORTED'; 低于当前 → 交 migrations 升级后返回。
 * 兼容「信封」与「裸 UserState」两种输入。
 */
export function parseSnapshot(json: string): UserState;

/** 导入: parseSnapshot → adapter.push 覆盖 → 返回 SyncResult。校验失败抛 SnapshotError(不 push)。 */
export async function importSnapshot(adapter: SyncAdapter, json: string): Promise<SyncResult>;
```

#### UI 层配套(`composables/useSnapshot.ts`, 属 composables 层, 允许依赖 store/service)
```ts
function triggerDownload(filename: string, text: string): void; // Blob + a[download], 用后 revoke
async function onExport(): Promise<void>;   // exportSnapshot → triggerDownload → useToast 成功
async function onImport(file: File): Promise<void>; // FileReader → importSnapshot → user store 重新水合 → toast
```
> 关键: 导入 push 成功后, **user store 必须重新水合**(以 `SyncResult.state` 或再 `pull()` 覆盖响应式切片), 否则 UI 不刷新。snapshot-service 保持纯净, 水合动作在 store/composable。

#### vitest 单测要点 (`snapshot-service.spec.ts`, adapter 用 mock/内存实现)
1. **导出内容**: mock `pull()` 返回已知 state → `JSON.parse(exportSnapshot())` 的 `app/schemaVersion` 正确, `state` 深等于原 state。
2. **round-trip**: `export → parseSnapshot` 深等于原 state(无损往返)。
3. **非法 JSON**: `parseSnapshot('{bad')` 抛 `SnapshotError` 且 `code==='INVALID_JSON'`。
4. **schema 不符**: `parseSnapshot('{}')`、缺 `answers`/`settings`、`settings.theme` 非法 → `'SCHEMA_MISMATCH'`。
5. **版本过高**: 信封 `schemaVersion = 现值+1` → `'VERSION_UNSUPPORTED'`。
6. **导入安全(核心)**: `importSnapshot(adapter, 非法JSON)` 抛错且 **`adapter.push` 从未被调用**(spy 断言 0 次)——证明「拒绝不污染」。
7. **导入成功**: 合法信封 → `adapter.push` 被调用且入参 state 正确 → 返回 `SyncResult` 带新 revision。
8. **兼容裸 state**: 直接传 `JSON.stringify(userState)`(无信封)也能 parse 成功。
9. **文件名格式**: `snapshotFilename(固定 now)` 匹配 `n1-center-backup-\d{8}-\d{4}\.json`。

---

### 9.3 UserState schema 逐条核对 (Spec §6.1 ↔ domain.ts ↔ openapi.yaml)

**真源判定**: Spec §0 声明「配套契约代码为真源」, 但 Spec §6.1 的 `Settings` 比 domain.ts 的 `UserSettings` **多 3 个字段**, 且这 3 个字段有已锁定的 AC 背书 → 判定 **Spec §6.1 的完整 Settings 为产品意图, domain.ts 不完整需修正**(已在 Phase 2 修正, 见下)。

#### 逐字段核对表
| 字段 | Spec §6.1 | domain.ts(修正前) | 结论 / 处置 |
|------|-----------|------------------|-------------|
| `UserState.schemaVersion` | number | number | ✅ 一致(STORE_KEY=`n1-center-v1`, SCHEMA_VERSION=1) |
| `UserState.answers` | `Record<string,AnswerRecord>` | 同 | ✅ 一致 |
| `UserState.favorites` | `Record<string,FavoriteRecord>` | 同 | ✅ 一致 |
| `UserState.daily` | `Record<string,DailyRecord>` | 同 | ✅ 一致 |
| `UserState.settings` | `Settings` | `UserSettings` | ⚠️ 命名差异(见下) |
| `AnswerRecord.sub` | `sub?: number` | `sub: number \| null` | ⚠️ 以 domain 为准(见下 A) |
| `AnswerRecord.meta.type` | `type: string`(必填) | `type?: string`(可选) | ⚠️ 以 domain 为准(见下 B) |
| `FavoriteRecord.kind` | `kind: string` | `kind: ContentKind` | ⚠️ 以 domain 为准(更严, 见下 C) |
| `Settings.dailyTarget` | number | number | ✅ |
| `Settings.volume` | number | number | ✅ |
| `Settings.theme` | `'light'\|'dark'` | **缺失** | ❌→✅ **已补**(见下 D, 阻断项) |
| `Settings.fontSize` | number | **缺失** | ❌→✅ **已补**(见下 D, 阻断项) |
| `Settings.playbackRate` | number | **缺失** | ❌→✅ **已补**(见下 D, 阻断项) |

#### 处置说明
- **A. `AnswerRecord.sub`**: 统一为 `number | null`(键恒存在, 听解/例文为 `null`)。理由: JSON 快照往返与 openapi(`nullable:true`, `required` 含 sub)需要显式 null, `sub?` 省略键会导致导入/远端契约不一致。Spec §6.1 的 `sub?:number` 应按 domain 的 `number|null` 理解。**无需改代码**(domain 已正确)。
- **B. `AnswerRecord.meta.type`**: 保持可选 `type?`(与 openapi 一致)。旧数据可能无 type, 强制必填会导致导入/迁移失败。Spec §6.1 措辞从宽。**无需改代码**。
- **C. `FavoriteRecord.kind`**: 保持 `ContentKind`(比 Spec 的 `string` 更严, 类型即契约)。**无需改代码**。
- **D. `Settings` 补齐 3 字段(阻断修正, 本 Phase 已落地)**: 缺失 `theme/fontSize/playbackRate` 会直接违反 **AC-08**(深色/字号刷新保留、全站生效)与 **AC-06 偏好持久**(倍速)。已修正:
  - `src/types/domain.ts`: `UserSettings` 增 `theme:'light'|'dark'`、`fontSize:number`、`playbackRate:number`;`createDefaultUserState()` 默认值 `{ ..., theme:'light', fontSize:16, playbackRate:1 }`。
  - `openapi.yaml`: `UserSettings` schema 增 3 字段并纳入 `required`(fontSize 14~20, playbackRate enum [0.75,1,1.25])。
  - `src/constants/index.ts`: 增 `PLAYBACK_RATES=[0.75,1,1.25]`、`FONT_SIZE={min:14,max:20,default:16,step:1}`、`THEMES`、`SNAPSHOT_APP_ID`。
- **命名**: 运行时类型名统一用 `UserSettings`(domain 真源);Spec §6.1 的 `Settings` 为示意名, 不再单列类型。

#### 迁移与向后兼容(已在 `migrations.ts` 落地, pull() 调用)
- 旧版单文件应用同样写 `n1-center-v1`, 其 `settings` 可能缺 `theme/fontSize/playbackRate` 甚至结构不同。pull() 对 settings 深合并 `createDefaultUserState().settings`、缺字段回填默认(防 Spec §11「旧用户数据丢失」坑, 保 AC-04/AC-06/AC-08)。**此要求已由 `migrate()` 落地**(architect 补丁, 2026-08-01): settings 字面量含全 5 字段, `theme` 非 'dark' 回退默认、`fontSize/playbackRate` 缺失经 `numberOr` 回退默认 —— 即本节要求的实现, 非待办。
- 本次为**同版本内补字段**(SCHEMA_VERSION 仍为 1, 应用尚未发布): 不做 version bump, 由 `migrate()` 的「默认深合并」兜底即可;`migrations.ts` 同时负责「未知/legacy 形状 → v1」的规整。
- 注: 取值域收紧(fontSize 14~20 / playbackRate ∈ [0.75,1,1.25])由 **UI 写入端**(settings store, 依 `FONT_SIZE`/`PLAYBACK_RATES` 常量)强制;`migrate()` 只做「缺失回填」, 因 localStorage 值本就出自受控 UI, 无需在迁移层重复钳制(恰到好处, 见 §9.3 advisory A1/A2)。

#### advisory(非阻断, 供 designer/前端)
- **A1. fontSize 全站生效机制**: `fontSize` 存为根字号 px(默认 16)。若 `tokens.css` 的 `--text-*` 为固定 px, 调 fontSize 不会级联。建议二选一(designer 拍板): ①`--text-*` 改 rem 基;②settings store 写 `--font-scale` 根变量, 字号相关 token 用 `calc(<base> * var(--font-scale))`。schema 不受影响。
- **A2. playbackRate 落位**: 顶栏/听解页倍速控件写 `settings.playbackRate`, `useAudioPlayer` 读取并设 `audio.playbackRate`;取值限 `PLAYBACK_RATES`。
- **A3. theme 落位**: settings store watch `theme` → `document.documentElement.setAttribute('data-theme', theme)`(对齐 §8.1 暗色策略)。
