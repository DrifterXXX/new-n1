/**
 * 占位 SyncAdapter: 未来后端云同步。
 * 当前阶段无后端 —— 全部方法抛 NotImplemented, 仅锁定契约与端点映射。
 * 未来实现只改本文件内部, 业务层(stores)零改动。
 * 端点定义见项目根 openapi.yaml。
 */
import type { SyncAdapter, SyncResult } from './types';
import type { UserState } from '@/types/domain';

export interface RemoteAdapterOptions {
  baseUrl: string; // 如 '/api/v1'
  getToken?: () => string | null; // 将来注入 Bearer token
}

const NOT_IMPL = 'RemoteAdapter 尚未实现(本阶段无后端)。契约见 src/services/sync/types.ts 与 openapi.yaml。';

export function createRemoteAdapter(_opts: RemoteAdapterOptions): SyncAdapter {
  return {
    name: 'remote',

    async init(): Promise<void> {
      throw new Error(NOT_IMPL);
    },

    // 未来: GET {baseUrl}/state -> { state, revision, syncedAt }
    async pull(): Promise<SyncResult> {
      throw new Error(NOT_IMPL);
    },

    // 未来: PUT {baseUrl}/state, Header If-Match: <revision>; 409 表冲突
    async push(_state: UserState): Promise<SyncResult> {
      throw new Error(NOT_IMPL);
    },

    // 未来: GET {baseUrl}/state/stream (SSE) 或轮询
    subscribe(_onChange: (r: SyncResult) => void): () => void {
      throw new Error(NOT_IMPL);
    },

    // 未来: DELETE {baseUrl}/state
    async clear(): Promise<void> {
      throw new Error(NOT_IMPL);
    },
  };
}
