# ADR-001: 采用 Vue 3 + Vite + TypeScript + Pinia + vue-router 作为技术栈

## Status
Accepted (2026-07-31)

## Background
「JLPT N1 备考中心」原为单文件 index.html + data.js 全局变量的纯前端应用，功能已具规模(学习台/训练/例文/听解/读解/错题本/策略 + 大量音频交互)，但无模块化、无类型、难维护。项目决定 Route B 重构，框架已定 Vue 3。需要在其上确定构建工具、语言、状态管理与路由方案。约束: 本地优先、无后端、不部署。

## Decision
锁定以下技术栈与稳定版本(2026-07-31 核实):
- vue 3.5.40 (3.6 Vapor 仍 beta, 不用)
- vite ^7.3.0 + @vitejs/plugin-vue ^6.0.0
- typescript ~5.9 (strict) + vue-tsc ^2.2.0
- pinia ^3.0.4
- vue-router ^4.6.4
- vitest ^3.0.0 (测试), eslint + eslint-plugin-vue (含 max-lines:300)

对比方案 Nuxt 4 与 CDN 免构建后选定本组合(加权评分约 4.8, 详见 docs/ARCHITECTURE.md 第 1 节)。

## Consequences
正面:
- 官方全家桶，生态成熟、文档完善、团队熟悉度高(框架已定 Vue 3)。
- Vite 冷启动/HMR 快；TS strict 把全局变量式代码升级为可契约化类型系统。
- Pinia 天然承载"业务层依赖抽象存储"的分层要求(见 ADR-002)。
- 纯静态产物, 契合无后端/无部署, 将来可零成本挂任意静态托管。

负面/权衡:
- 引入构建步骤与依赖管理(相较裸 HTML)，但这是走向组件化的必要成本。
- 放弃 Nuxt 的 SSR/SSG/服务端数据加载能力 —— 但本项目无 SEO/无服务端数据需求, 属正确取舍。

## Related ADRs
- ADR-002 (云同步接口抽象)
- ADR-003 (图标库锁定 Lucide)
