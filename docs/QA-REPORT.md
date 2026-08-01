# QA 验收报告 — JLPT N1 备考中心 v1.0 (Route B)

> 验收阶段：Phase 4 质量门禁
> 被测提交：`81b568f` (Phase 3 前端) + `150f679` (构建产物忽略)
> 验收依据：`docs/SPEC.md` §9 验收标准 AC-01 ~ AC-11（EARS）+ `docs/ARCHITECTURE.md` §9
> 测试者：严过关（QA 工程师）
> 日期：2026-08-02
> 环境：node v22.22.2 / 无浏览器 GUI（DOM 相关项按静态+构建产物取证，标注 advisory）

---

## RoleVerdict

```yaml
verdict: fail

blocking:
  - 违反项: AC-10 离线字体 —— 应用依赖 Google Fonts CDN，零自托管 woff2
    证据: |
      index.html:9-14 三行外链（preconnect fonts.googleapis.com / preconnect
      fonts.gstatic.com / <link href="https://fonts.googleapis.com/css2?family=Inter
      &family=JetBrains+Mono&family=Noto+Sans+JP&family=Noto+Sans+SC&family=Noto+Serif+JP">）；
      仓库内 woff2 文件数 = 0（find . -name '*.woff2' -not -path './node_modules/*'）；
      src/styles/*.css 内 @font-face 声明数 = 0；
      构建产物同样带毒：dist/index.html 保留全部三条 CDN 外链，dist woff2 数 = 0。
      src/styles/tokens.css:56-60 的 --font-ui/--font-jp/--font-reading/--font-cn/--font-mono
      直接引用 "Inter"/"Noto Sans JP"/"Noto Serif JP"/"Noto Sans SC"/"JetBrains Mono"
      族名，但无任何本地 @font-face 提供这些字体 → 离线时全部落到 system-ui/serif 兜底。
    期望: |
      SPEC §4 技术架构「字体：自托管 woff2 —— **离线可用**，不由 CDN 提供（用户裁决）」；
      SPEC §9 AC-10「When 离线打开应用，系统**必须**用自托管 woff2 渲染（不依赖 CDN）」。
      需将 5 个字族的 woff2 子集落到 public/fonts/，在 src/styles 内以 @font-face
      (font-display: swap, unicode-range 子集化) 声明，并删除 index.html:9-14 全部外链。
      特别注意 SPEC §8 指定读解长文正文必须为 Noto Serif JP 明朝体——当前离线场景下
      该字体完全不可用，读解版式降级为系统 serif，属功能性劣化而非纯视觉问题。

  - 违反项: AC-06 听解播放器 —— 「逐句定位」能力未接入任何 UI，用户不可达
    证据: |
      src/stores/audio.ts:147-150 定义了 seek(ratio) 函数，但全项目 UI 层
      （src/components + src/views）对 audio.seek 的调用点数 = 0 → 死代码。
      src/components/layout/AudioMiniDock.vue:28-30 的进度条是只读展示：
      role="progressbar" + :style="{width: percent+'%'}"，无 pointerdown/click/
      input 事件绑定，无法拖动定位。
      全项目仅有的两个 type="range" 控件位于
      src/components/layout/AppTopbar.vue:56（音量）与
      src/components/layout/SettingsDrawer.vue:64（字号/音量），均与音频定位无关。
      src/components/question/ListeningCard.vue 整卡无任何进度/定位控件。
    期望: |
      SPEC §9 AC-06「When 播放听解题，系统**必须**支持逐句定位、变速(0.75/1.0/1.25)、
      原文显示切换」。三项能力中变速与原文切换已满足（见 evidence），逐句定位缺失。
      需为听解播放器提供可交互定位控件（可拖动进度条或句级锚点跳转），并接上既有
      audio.seek()。

advisory:
  - 建议项: 补齐 stores 层自动化测试，并将本轮 10 条集成用例固化进仓库
    理由: |
      现有 23 条单测全部集中在两个纯 TS service（content-service 13 / snapshot-service 10），
      AC-01/02/03/04 所依赖的 progress store、user store、真实 LocalStorageAdapter
      此前零自动化覆盖。本轮我以真实 adapter + 真实 pinia store 补跑 10 条集成用例
      （全绿，见 evidence），但作为临时验收产物已删除。建议正式纳入
      src/stores/progress.spec.ts 与 src/services/sync/local-storage-adapter.spec.ts，
      作为掌握阈值（3）与旧 key 兼容的永久回归护栏——这两处一旦回退，
      用户数据静默丢失且无任何测试报警。

  - 建议项: 补 ESLint 与 max-lines 规则，或修订 SPEC 措辞
    理由: |
      SPEC §10 声称「单文件 ≤300 行（ESLint max-lines 强制）」，但 package.json 内
      eslint 相关依赖数 = 0，仓库无 .eslintrc* / eslint.config.*。该约束当前
      **完全无强制机制**，仅靠人工自律维持。实测最大文件
      src/components/question/TrainFlow.vue = 283 行，尚在阈值内但余量仅 17 行，
      下一次迭代极易越界且不会被任何门禁拦下。

  - 建议项: 清理 audio.seek() 死代码或补齐调用
    理由: |
      与 blocking#2 同源。若产品决定砍掉逐句定位（需改 SPEC AC-06），
      则 src/stores/audio.ts:147-150 应一并删除，避免留下"看起来实现了"的假信号——
      这正是生成式代码典型的「静默缺失」失效模式：能力在服务层存在，
      UI 层从未接线，静态阅读代码会误判为已完成。

  - 建议项: 增加应用级错误边界
    理由: |
      全项目 onErrorCaptured / app.config.errorHandler 命中数 = 0。
      6 个视图为懒加载（router/index.ts:26-57），任一 chunk 加载失败或渲染抛错
      会导致 #app 整体白屏，且无兜底 UI。localStorage 失败路径已有降级
      （AppShell.vue:21 role="alert" 展示 user.storageError），但渲染错误无对应处理。

  - 建议项: 错题本增加「重练本题」直达入口
    理由: |
      掌握回路（AC-03）在实现上可达但路径隐蔽：ListeningCard.vue:56 有
      `if (answered.value) return;` 一次性作答锁，题库页答过即锁定；
      streak 只能靠 /train 的「错题回练」模式（session.ts poolWrong）累积。
      ReviewView 无直接重练 CTA，用户需自行领悟"去题型训练选错题回练"
      才能把错题练到掌握。功能不算缺失，但可发现性差。

  - 建议项: package.json 补 engines 字段
    理由: |
      无 engines 声明（grep '"engines"' = 0）。package-lock.json 存在，
      依赖版本已锁定，但 Node 版本未约束，跨机器构建存在漂移风险。
      当前验证环境 node v22.22.2。
```

---

## 一、验收标准逐条映射（AC-01 ~ AC-11）

| 编号 | EARS 验收标准（原文） | 结论 | 证据 |
|------|----------------------|------|------|
| **AC-01** | When 用户答任一题，系统**必须**记录 answer 并写入 UserState | ✅ pass | `src/stores/progress.ts:97-121` `record()` 写入 `user.state.answers[answerKey(...)]`；QA 集成用例「AC-01 答题即写入 UserState」通过。作答入口三处均归一到该函数：`ListeningCard.vue:57`、`ReadingArticle.vue:40`、`session.ts:169`（TrainFlow 经 `session.answer` 转发，`TrainFlow.vue:44`） |
| **AC-02** | If 答错，系统**必须**将该题加入错题本并在复习优先出现 | ✅ pass | `progress.ts:52-59` `wrongEntries` 以 `!correct \|\| wrongCount>0` 入池，`.sort((a,b)=>b.record.at-a.record.at)` 最近优先；`progress.ts:102` 累加 `wrongCount`。QA 集成用例「AC-02 答错进错题本」通过 |
| **AC-03** | While 某题连续答对 ≥3 次，系统**应该**不再于复习中推送该题 | ✅ pass | `progress.ts:15` `MASTERY_STREAK=3`；`:101` 答对 `streak+1`／答错归 0；`:47-49` `isMastered()`；`:56` 掌握即移出回收池。QA 集成用例覆盖 1/2/3 次三档 + 「连对2次后答错需重新连对3次」边界，均通过。回路可达性：`/train` → 错题回练（`session.ts` `poolWrong`）可重复作答累积 streak（见 advisory 5：路径隐蔽） |
| **AC-04** | When 刷新/关闭重开，系统**必须**完整恢复进度/错题/收藏/设置 | ✅ pass | key 兼容旧版：`constants/index.ts:7` `STORE_KEY='n1-center-v1'`；`user.ts:62-74` `init()` 首次 pull 水合，`:52-59` deep watch + `:44-50` 400ms 防抖 push；`migrations.ts:16-41` 补齐缺失字段。QA 集成用例三条全通过：旧版无 `schemaVersion` 数据答题/收藏/每日/设置零丢失且缺失字段回退默认、损坏 JSON 不崩溃回退默认态、push→pull 往返无损且 revision 自增 |
| **AC-05** | When 点导出必须下载全量 JSON；导入合法 JSON 必须完整还原；If 非法 JSON 必须拒绝并提示 | ✅ pass | 导出 `useSnapshot.ts:54-68`（`user.flush()` 先落盘 → `exportSnapshot` → `triggerDownload`）；导入 `:70-86`，错误分三类文案 `:16-20`（INVALID_JSON / SCHEMA_MISMATCH / VERSION_UNSUPPORTED）经 `toast.danger` 提示。**不污染**为最关键项：QA 集成用例「AC-05b」以 6 种非法输入（非 JSON／截断 JSON／`[]`／`null`／错误 app id／版本过高）逐个导入，全部 reject，且导入前后 localStorage **字节级快照完全一致**；另有既有单测「非法 JSON: 抛错且 push 从未被调用」 |
| **AC-06** | When 播放听解题，必须支持**逐句定位**、变速(0.75/1.0/1.25)、原文显示切换 | ❌ **fail** | 变速 ✅：`constants/index.ts:53` `PLAYBACK_RATES=[0.75,1,1.25]`，`settings.ts:39-43` `cyclePlaybackRate()`，`ListeningCard.vue:84-92` 挂钮，`audio.ts:158-163` watch 实时应用到 `el.playbackRate`。原文切换 ✅：`ListeningCard.vue:120-129` toggle + `:133-140` 条件渲染（作答前禁用，属 PAGE-SPECS §4 强制音频优先的有意设计）。**逐句定位 ❌**：`audio.ts:147-150` `seek()` 零 UI 调用点，`AudioMiniDock.vue:28-30` 进度条只读。详见 blocking#2 |
| **AC-07** | When 业务层调用数据接口且将来 RemoteAdapter 替换 LocalStorageAdapter，必须业务代码零改动 | ✅ pass | 具体实现仅在装配点出现：`main.ts:10,15` 是全项目唯一 `createLocalStorageAdapter` 引用；业务层（stores/components/views/composables）直接触碰 `localStorage` 的行数 = **1**，且该行为 `constants/index.ts:6` 的注释文字，非代码。`user.ts:64` 只经 `getSyncAdapter()` 抽象取实例；`sync/index.ts:12-24` 单例装配；`remote-adapter.ts` 五方法齐备并抛 NotImplemented，契约面与 `types.ts` 一致 → 替换 `main.ts:15` 一行即可切换 |
| **AC-08** | When 用户切深色模式/调字号，刷新后必须保留且全站生效 | ✅ pass（DOM 生效为 advisory 取证） | 持久化 ✅：`settings.ts:17` 直接读写 `user.state.settings`，随 user store 统一持久化，无旁路（未引 pinia-persistedstate，符合 SPEC §11 防坑）。应用 ✅（静态取证）：`settings.ts:55-60` `apply()` 写 `<html data-theme>` + `root.style.fontSize`，`:62` `watch([theme,fontSize], apply, {immediate:true})`，`App.vue:19` 启动调用；`tokens.css:127` `:root[data-theme="dark"]` 深色覆盖存在；字号经 rem 级联（`tokens.css` `--text-*`）。`settings.ts:33` `setFontSize` 钳制入 `FONT_SIZE{min:14,max:20}`。**说明**：无浏览器 GUI，未做像素级渲染验证，属 advisory 取证 |
| **AC-09** | If 真人音频加载失败，必须回退 TTS + toast 提示 | ✅ pass（同上，运行时未做真机验证） | 双失败路径均接管：`audio.ts:95` `el.addEventListener('error', () => speak(ttsText))` 与 `:125` `audio.play().catch(() => speak(ttsText))`。`speak()` `:57-76` 用 `SpeechSynthesisUtterance`，`lang='ja-JP'`，继承 `settings.playbackRate/volume`，`:74` `toast.info(TTS_NOTICE)` 提示「本题真人音频未生成，暂用浏览器朗读」。二次降级 `:58-62`：浏览器不支持 speechSynthesis 时置 `status='error'` + `toast.danger`，四态机闭合（idle/loading/playing/error）。`usingTts` 透传至 `AudioBtn.vue:20` 供 UI 区分 |
| **AC-10** | When 离线打开应用，必须用自托管 woff2 渲染（不依赖 CDN） | ❌ **fail** | 见 blocking#1：`index.html:9-14` 三条 Google Fonts 外链；woff2 文件数 = 0；`@font-face` 声明数 = 0；`dist/index.html` 同样保留外链、`dist` 内 woff2 = 0 |
| **AC-11** | While 渲染任意 UI，必须不使用 emoji 图标、不硬编码颜色、不出现紫粉渐变 | ✅ pass | 五项 P0 扫描全零命中，详见第二节 |

**AC 汇总：9 pass / 2 fail（AC-06、AC-10，均为 P0）**

---

## 二、P0 绝对规则全量终扫

扫描范围：全部已提交 `src/**/*.{vue,ts,css}` + `index.html`

| # | 规则 | 命中数 | 结论 | 方法 |
|---|------|--------|------|------|
| 1 | emoji 作为 UI 图标 | **0** | ✅ pass | perl 全量 Unicode 区段正则（含 1F300-1F9FF / 2600-26FF / 2700-27BF / FE00-FE0F / 1F000-1F02F / 1F0A0-1F0FF / 1F100-1F64F / 1F680-1F6FF / 1F900-1F9FF / 1FA00-1FA6F / 1FA70-1FAFF / ZWJ 200D / 20E3 / E0020-E007F） |
| 2 | 裸 hex 硬编码（`#fff`/`#000` 除外） | **0** | ✅ pass | perl 提取全部 `#[0-9a-f]{3,8}`，白名单 fff/000/ffffff/000000/ffffffff/00000000，排除 `tokens.css`（唯一允许的颜色定义源）。图标经 `AppIcon.vue` 白名单单一出口，颜色一律 `var(--color-*)` |
| 3 | 紫→粉渐变 | **0** | ✅ pass | 关键词 + 常见色值（purple/violet/fuchsia/magenta/#7C3AED/#A855F7/#EC4899/#8B5CF6/#D946EF/from-purple/to-pink） |
| 4 | 弹跳缓动 `cubic-bezier(0.68,-0.55,0.265,1.55)` | **0** | ✅ pass | 正则 `cubic-bezier\(\s*0?\.68\s*,\s*-0?\.55` |
| 5 | AI 模板味占位文案 | **0** | ✅ pass | Lorem ipsum / Welcome to / Sign up today / placeholder text / coming soon 全零命中 |

> **排除说明**：`src/data/readings.json:755,782` 出现 `XXX-XXXX` / `〒XXX-XXXX`，为 JLPT 读解真题体裁中电话号码与邮编的标准脱敏写法（日语公文常规），属**内容资产**而非 UI 占位文案，不计缺陷。

---

## 三、构建与测试门禁

| 门禁 | 命令 | 结果 |
|------|------|------|
| 类型检查 | `vue-tsc --noEmit -p tsconfig.json` | ✅ 0 error |
| 单元测试 | `vitest run` | ✅ 23/23 通过（content-service 13 + snapshot-service 10），耗时 755ms |
| QA 补充集成测试 | 真实 LocalStorageAdapter + 真实 pinia store，10 条 | ✅ 10/10 通过（验收后已清除临时文件，`git status` 无 src 变更） |
| 生产构建 | `npm run build` | ✅ 成功，3.93s |
| 运行时冒烟 | `vite preview` + 8 路由探活 | ✅ `/` `/dashboard` `/train` `/examples` `/listening` `/reading` `/review` `/strategy` 全 HTTP 200；JS entry chunk 200 |
| 单文件 ≤300 行 | `wc -l` | ✅ 最大 283 行（TrainFlow.vue），全数达标（但无 ESLint 强制，见 advisory 2） |

**代码分包**：视图全部懒加载，首屏仅 `index-B_M6gRao.js` 151.41 kB（gzip 58.42 kB）+ `index-qTTPMDDL.css` 22.51 kB（gzip 4.67 kB）；题库按需（listening 244.78 kB / readings 69.12 kB / examples 61.60 kB）——符合 SPEC §10「首屏 <2s」的结构性前提。

**测试完整性反作弊门（5 类）**：本次为 Phase 3 首次交付，无前序测试基线可比对（`git diff HEAD~1` 对应的 `06d0d82` 为重构前旧版单文件应用，无测试）。检测项 1/2/3/5（删测试、断言数下降、新增 skip/xfail、框架配置篡改）**不适用**；检测项 4（断言硬编码实现自身输出）人工审查：既有 23 条断言值均来自 SPEC 定义的归一化规则与信封结构，非复述实现返回值，**通过**。下一轮迭代起本报告可作为基线。

---

## 四、生成式代码失效模式核对（6 类）

| 失效模式 | 结果 | 说明 |
|----------|------|------|
| Happy-path 偏差 | ✅ 通过 | 异常路径有实现：损坏 JSON 回退默认（`local-storage-adapter.ts:39-41`）、越界 answer 钳制+warn（content-service）、存储失败降级提示（`user.ts:39-41` + `AppShell.vue:21`）、音频失败双重降级（`audio.ts:95,125` → TTS → 不支持则 error toast）、空/加载态组件在 5 视图 + 2 组件中实际使用（EmptyState / SkeletonBlock） |
| 沉默逻辑错误 | ✅ 通过 | 最高风险的 answer 基线不一（听解 0-based / 读解 1-based）与读解下标顺序依赖，均有针对性单测锁定（「逐条防漏 -1 / 重复 -1 回归」「id 注入即数组下标（验证未排序）」「幂等性」） |
| 幻觉依赖/接口 | ✅ 通过 | 4 运行时依赖 + 6 开发依赖全部真实存在且 `package-lock.json` 锁定；构建与测试均实跑通过；无引用不存在的模块 |
| 缺失系统上下文 | ❌ **命中** | **AC-10 即此类**：实现者按通用 Web 习惯接了 Google Fonts CDN，未落地本项目"本地优先／离线可用／数据不外传"这一**核心产品前提**（SPEC §1 一句话描述、§4 用户裁决、§10 隐私约束三处均已明示）。这是本轮最典型的上下文丢失 |
| 性能盲区 | ✅ 通过 | 视图懒加载、题库动态 import、持久化 400ms 防抖（`PERSIST_DEBOUNCE_MS`）、`content-service` 加载期一次性归一并冻结、`preload='none'` 音频。无 N+1 式重复计算 |
| 静默缺失 | ❌ **命中** | **AC-06 逐句定位即此类**：`audio.seek()` 在服务层写好且类型正确，UI 层从未接线 → 静态阅读代码/看 store 导出会误判为"已实现"，只有追调用点才暴露。同类需警惕 `AudioMiniDock` 进度条的 `role="progressbar"`（语义为只读展示，非 slider，无障碍语义本身正确，但易被误读为可交互） |

---

## 五、生产就绪评分卡

> 未找到 `references/01-standards/production-readiness-scorecard.md`，按常识维度评定。本阶段明确不部署，发布类维度标注 N/A。

| 维度 | 档位 | 证据 / 缺口 |
|------|------|------------|
| 测试 + 回归 | **Bronze** | 23 条单测全绿但全部集中在 2 个纯 TS service；stores 层（progress/user/session/settings/audio）与 sync adapter 零常驻测试；无 E2E。本轮 10 条集成用例证明这些层**当前行为正确**，但未固化为仓库资产 → 无回归护栏 |
| 契约 | **Gold** | `SyncAdapter` 抽象完整（init/pull/push/subscribe/clear 五方法），LocalStorage 与 Remote 双实现契约面一致；`openapi.yaml` 预留云端端点；业务层零具体实现耦合（AC-07 实测通过）；`schemaVersion` + `migrations.ts` 提供前向兼容位 |
| 安全 | **Silver** | 无后端、无认证、无网络写入，攻击面极小；数据仅存本机符合隐私承诺。**但** AC-10 的 Google Fonts CDN 会在每次加载时向第三方泄露用户 IP/UA/Referer，与 SPEC §10「所有学习行为数据仅存本地、不外传」的隐私定位相抵触 → 修掉 blocking#1 后可升 Gold。导入路径有 schema 守卫且校验不过绝不落盘（已实测字节级不污染） |
| 无障碍 | **Silver** | 键盘可达（TrainView 1-4 + Enter）、`aria-label`/`aria-pressed`/`aria-expanded`/`role="alert"`/`role="progressbar"` 使用规范；答题反馈三重编码（图标+文本+颜色）满足色盲可达；字号 14-20px 可调；`--tap-min` 触达尺寸令牌。缺口：无浏览器环境未能实测对比度与焦点环，未跑 axe |
| 性能 | **Silver** | 首屏 gzip 约 63 kB（JS+CSS），题库按需加载，持久化防抖，归一化一次性冻结。缺口：无 Lighthouse/实测数据佐证 SPEC §10 的「首屏<2s / 路由切换<200ms / 音频起播<500ms」三项数字 |
| 可观测 | **Bronze** | 仅 `console.warn`（content-service 越界）+ 用户可见 toast/alert 降级提示；无错误上报、无应用级 errorHandler、无 `onErrorCaptured` 边界（命中数 0）；懒加载 chunk 失败会整页白屏且无兜底 |
| 发布安全 | **N/A** | 本阶段不部署（SPEC §4 明确「本地 http.server / vite preview」）。构建可重现性方面：`package-lock.json` 已锁定依赖，但 `package.json` 无 `engines` 字段约束 Node 版本 |
| **总档（取最低）** | **Bronze** | 受「测试+回归」与「可观测」两项拖累。**注**：本项目为个人本地工具、明确不商用不部署，Silver 门槛不构成交付阻断；真正的交付阻断是上方 2 条 P0 blocking |

---

## 六、上线建议

**不通过（fail）** — 2 项 P0 blocking 未清零，按「P0 不归零不上线」纪律退回前端修复。

工程质量整体扎实：分层架构干净、依赖倒置真落地（AC-07 实测可替换）、SPEC §11 五个已知坑（音频编号错配／读解顺序依赖／answer 基线不一／旧 key 兼容／persistedstate 绕过抽象）**全部防住且有测试锁定**、P0 视觉规则五项零命中、类型与构建全绿。11 条 AC 中 9 条通过。

两条 blocking 均非架构性缺陷，属**收尾接线遗漏**，修复面小且互不影响：

1. **AC-10（工作量中）**：下载 5 字族 woff2 子集 → `public/fonts/` → 补 `@font-face` → 删 `index.html:9-14`。需注意读解正文 Noto Serif JP 是 SPEC §8 硬性版式要求，不可省。建议同步做 `unicode-range` 子集化控制体积（日文全集较大）。
2. **AC-06（工作量小）**：给听解播放器加可拖动进度条并接 `audio.seek()`（服务层已就绪，仅缺 UI 与事件绑定）。

建议修复后重跑本报告第二、三节全部门禁 + 补 AC-06/AC-10 两条针对性回归，即可放行。

---

## 七、回归集建议（修复后应沉淀）

| 建议回归用例 | 对应缺陷 | 建议路径 |
|--------------|----------|----------|
| 断言 `index.html` 与 `dist/index.html` 零外部 http(s) 引用；断言 `public/fonts/*.woff2` 存在且 `@font-face` 覆盖全部 5 个 `--font-*` 族名 | blocking#1 / AC-10 | `src/__tests__/offline-assets.spec.ts` |
| 断言 `audio.seek(0.5)` 被 UI 事件触发后 `currentTime` 变更；组件层断言听解卡存在可交互定位控件 | blocking#2 / AC-06 | `src/stores/audio.spec.ts` |
| 旧 key `n1-center-v1` 无 `schemaVersion` 数据迁移后答题/收藏/每日/设置零丢失；损坏 JSON 回退默认 | AC-04 常驻护栏 | `src/services/sync/local-storage-adapter.spec.ts` |
| 连对 1/2 次仍在回收池、第 3 次移出；连对 2 次后答错 streak 归零 | AC-03 常驻护栏 | `src/stores/progress.spec.ts` |
| 6 种非法快照导入全部 reject 且 localStorage 字节级不变 | AC-05 常驻护栏 | `src/services/sync/local-storage-adapter.spec.ts` |

> 本轮 QA 已实跑并验证上述后三类共 10 条用例全绿，代码可直接复用固化。
