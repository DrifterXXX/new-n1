/**
 * 云同步接口契约 (唯一真源 / SINGLE SOURCE OF TRUTH)
 * ---------------------------------------------------------------------------
 * 目标: 业务层(stores/组件)对"数据存哪里"完全无感。
 *      今天 localStorage, 明天后端 —— 业务代码零改动, 只在 main.ts 换一行 adapter。
 *
 * 分层红线:
 *  - 业务层只 import 本文件的抽象类型(SyncAdapter/UserState/SyncResult)。
 *  - 绝不 import 具体实现(local-storage-adapter / remote-adapter)。
 *  - 具体实现由 main.ts 装配, 经 services/sync/index.ts 的 initSync 注入。
 *  - 本文件为纯 TS, 无 Vue / 无 Pinia 依赖。
 * ---------------------------------------------------------------------------
 */

import type { UserState } from '@/types/domain';

export type { UserState } from '@/types/domain';

/** 一次同步操作的结果(快照 + 版本 + 时间)。 */
export interface SyncResult {
  /** 权威状态快照。 */
  state: UserState;
  /**
   * 单调递增版本号, 用于将来的冲突检测(乐观锁)。
   * MVP(localStorage) 每次 push 自增即可; 后端将据此实现 If-Match / 409。
   */
  revision: number;
  /** 本次同步完成时间(epoch ms)。 */
  syncedAt: number;
}

/**
 * 存储适配器抽象。
 *
 * 关键设计: 所有方法均为异步(Promise)。
 * localStorage 本是同步的, 但契约从第一天就异步化 —— 这样业务层的调用形态(await)
 * 不会因将来切换为网络请求而改变, 这是"零改动"承诺的核心。
 */
export interface SyncAdapter {
  /** 适配器标识, 用于诊断/日志(如 'local-storage' / 'remote')。 */
  readonly name: string;

  /**
   * 一次性初始化: 打开存储、校验 schema、执行迁移。
   * 应在 app 挂载前调用(见 initSync)。
   */
  init(): Promise<void>;

  /**
   * 拉取权威快照。
   * - LocalStorageAdapter: 读 localStorage[STORE_KEY] -> JSON.parse -> migrations; 失败回退默认态。
   * - RemoteAdapter(未来): GET /api/v1/state
   */
  pull(): Promise<SyncResult>;

  /**
   * 写入整份用户状态(MVP: last-write-wins), 返回带新 revision/syncedAt 的快照。
   * 传整份而非增量: 最简且够用; 增量/合并策略将来在 adapter 内部演进, 不影响业务层。
   * - LocalStorageAdapter: JSON.stringify -> 写入 -> revision 自增(包 Promise.resolve)。
   * - RemoteAdapter(未来): PUT /api/v1/state, Header If-Match: <revision>, 409 表冲突。
   */
  push(state: UserState): Promise<SyncResult>;

  /**
   * 订阅外部变更源, 返回取消订阅函数。
   * - LocalStorageAdapter: 监听 window 'storage' 事件(跨标签页同步)。
   * - RemoteAdapter(未来): SSE / WebSocket 推送, 或轮询。
   * 业务层对两者是同一个回调, 无需感知来源。
   */
  subscribe(onChange: (result: SyncResult) => void): () => void;

  /** 清空全部用户状态(登出 / 重置)。 */
  clear(): Promise<void>;
}

/** adapter 工厂签名(便于 main.ts 按环境装配)。 */
export type SyncAdapterFactory = () => SyncAdapter;
