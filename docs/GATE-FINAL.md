# Phase 4 质量门禁 — 最终放行

- 日期：2026-08-02
- 结论：**verdict: pass，blocking = 0（P0 归零）**
- 路由：Route B（前端组件化重构 + 重设计，跳过后端/部署，本地优先离线应用）

## 背景

QA 首轮（docs/QA-REPORT.md）verdict=fail，2 项 P0 blocking：
- **AC-10 离线字体**：`index.html` 三条 Google Fonts CDN 外链，仓库 0 woff2 / 0 @font-face，违背用户裁决「自托管 woff2」+「离线可用」。
- **AC-06 听解逐句定位**：`audio.seek()` 已写好但 UI 从未接线，进度条只读不可拖；dock 桌面端被 `@media` 隐藏。

项目总监独立核实两项均属实，派前端修复 agent，commit `e0e800a`。

## 复验证据（项目总监独立复核，非只信 agent）

| 验收点 | 复验方式 | 结果 |
|--------|----------|------|
| AC-10 无 CDN 外链 | Grep `dist/index.html` + `index.html`：`https?://\|fonts.googleapis\|fonts.gstatic\|preconnect` → 0 命中 | pass |
| AC-10 字体本地化 | `@fontsource` 5 包入 `node_modules` + `package.json` deps；`main.ts` 按字重 import；`dist` 含 943 个本地 woff2 子集 | pass |
| AC-06 进度条接 seek | Read `AudioMiniDock.vue`：`<input type="range" @input="onSeek">` → `audio.seek(value/100)`；桌面端不再隐藏；TTS 降级时 `disabled` | pass |
| 测试 | 独立重跑 `npm run test`：4 文件 **41/41 通过**（offline-fonts 10 + content-service 13 + snapshot-service 10 + audio 8） | pass |
| P0 五项终扫 | emoji 0 / 裸 hex 0 / 紫粉渐变 0 / 弹跳缓动 0 / 占位文案 0（前端自报 + 总监抽查 css） | pass |
| 类型 / 构建 | `typecheck` 0 错 / `build` 通过 | pass |

## 放行

Phase 4 门禁通过，P0 缺陷归零。Route B 前端重构可交付。
- 前端修复 commit：`e0e800a`
- 规格 / 设计交付物归档 commit：见 git log（docs/ + design-system/ + openapi.yaml；`.workbuddy/` 不入库）

## 已知 advisory（非阻塞，留待迭代）

1. **dist 体积 56M**（woff2 24M + woff 回退 ~32M，943 个子集文件）。@fontsource 对 Noto Sans JP/SC 按 unicode-range 切了 ~120 个数字子集，运行时浏览器只拉命中的几十 KB，首屏更快。若需瘦身可改引命名子集（`@fontsource/noto-sans-jp/japanese-400.css` + `latin-400.css`），dist 可降到 ~17M。dist/ 已 gitignore，不进仓库。
2. **暂停态 dock 收起后无法拖动**：`pause()` 把 status 置 idle → dock 隐藏。需 store 加 `resume()` 才能暂停态定位，属扩大范围，本次未做。AC-06「播放中逐句定位」已满足。
3. **ESLint 缺失**：SPEC §10 声称 `≤300 行 ESLint max-lines 强制`，实际无 eslint 配置，该约束无强制机制（实测最大 AudioMiniDock 235 行 / TrainFlow 283 行，余量有限）。
4. **无应用级错误边界**：`onErrorCaptured` / `errorHandler` 命中 0，懒加载视图 chunk 失败会白屏。
5. **package.json 无 engines 字段**：lock 存在但 Node 版本未约束。
