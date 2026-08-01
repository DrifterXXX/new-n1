# ADR-003: 锁定 Lucide 作为唯一 SVG 图标库, 经 AppIcon 白名单出口统一

## Status
Accepted (2026-07-31)

## Background
团队 P0 绝对规则: 禁止 emoji 作为功能图标; 必须锁定一套 SVG 图标库, 全项目统一、不混用。旧版单文件应用用中文文字("听""收藏""再生"等)作按钮, 无系统化图标。重构需选定并锁死一套图标方案。

## Decision
- 锁定 `lucide-vue-next` ^1.0.0 (Lucide 官方 Vue 3 实现, ISC 许可, 统一 24x24 stroke 风格, 可 tree-shaking)。
- 建立唯一封装组件 `src/components/common/AppIcon.vue`: 以白名单方式再导出项目所用图标, 统一 size/stroke/color(color 走 Design Token, 用 currentColor)。
- 强制约束: 业务组件禁止直接从 `lucide-vue-next` 引入图标, 一律经 `AppIcon`。ESLint 可加 `no-restricted-imports` 拦截。
- 禁止任何 emoji 承担功能图标语义。

## Consequences
正面:
- 单一来源天然满足"不混用"; 风格统一。
- 白名单出口让图标集合可控、可审计, tree-shaking 只打包用到的图标。
- 颜色经 currentColor + token, 与"禁止硬编码颜色"一致。

负面/权衡:
- 新增一层 AppIcon 封装 —— 但这是杜绝混用与 emoji 的工程保障, 成本极低。

## Related ADRs
- ADR-001 (技术栈)
