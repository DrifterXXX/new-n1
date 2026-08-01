# ADR-002: 以 SyncAdapter 抽象隔离持久化, 保证将来接后端业务零改动

## Status
Accepted (2026-07-31)

## Background
需求明确: 数据本地优先(localStorage), 但必须抽象出云同步接口层(本阶段不实现后端), 将来接账号/后端时业务逻辑零改动。旧版直接在业务函数里 `localStorage.getItem/setItem`, 存储与业务强耦合, 无法平滑迁移。

## Decision
定义 `SyncAdapter` 抽象接口作为持久化唯一契约(src/services/sync/types.ts):
- 方法: `init / pull / push / subscribe / clear`, **全部异步(Promise)**。
- 同步单位: 整份 `UserState`(answers/favorites/daily/settings), 携带 `revision` 版本号占位乐观锁。
- 默认实现 `LocalStorageAdapter`(读写 `n1-center-v1`, 兼容现有用户数据; `storage` 事件实现跨标签页同步)。
- 占位实现 `RemoteAdapter`(全部抛 NotImplemented, 注释标注对应 REST 端点; 契约见 openapi.yaml)。
- 装配注入: `main.ts` 选择 adapter 并 `initSync()`; 业务层只经 `getSyncAdapter()` 拿抽象。
- 业务层唯一持久化入口是 `stores/user.ts`: pull 水合 -> 深度侦听状态防抖 push -> subscribe 合并外部变更。feature store 只读写响应式切片, 永不碰存储。

不引入 `pinia-plugin-persistedstate`: 它会绕过抽象直写 localStorage, 破坏"零改动接后端"目标。

## Consequences
正面:
- 从 localStorage 切换到后端只需在 main.ts 换一行 adapter, 业务代码不动 —— 这是异步契约 + 整份快照设计带来的直接收益。
- services 层纯净(无 Vue/Pinia), adapter 与迁移逻辑可被 vitest 直接单测。
- 保留 `n1-center-v1` 键, 现有用户本地进度无缝延续。

负面/权衡:
- localStorage 本同步却包装成异步, 略增样板 —— 但正是它抹平了将来网络化的差异, 值得。
- MVP 用 last-write-wins, 无真正冲突合并; `revision` 仅占位。多端并发合并留待后端阶段(仅改 adapter)。

## 迁移注记(接后端时)
- 读解(READINGS)当前以数组下标为 id, answers 以此为键。后端建表须为读解补真实主键, 并提供下标->主键映射的一次性迁移, 否则历史答题记录会错位。

## Related ADRs
- ADR-001 (技术栈)
