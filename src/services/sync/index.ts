/**
 * 同步服务单例。
 * main.ts 在挂载前调用 initSync(adapter) 完成装配与首次 init;
 * 业务层(stores/user.ts)调用 getSyncAdapter() 获取当前 adapter。
 * 业务层永远不知道具体是 LocalStorage 还是 Remote。
 */
import type { SyncAdapter } from './types';

let activeAdapter: SyncAdapter | null = null;

/** 装配并初始化 adapter(打开存储/迁移)。返回该 adapter。 */
export async function initSync(adapter: SyncAdapter): Promise<SyncAdapter> {
  activeAdapter = adapter;
  await adapter.init();
  return adapter;
}

/** 获取当前 adapter; 未初始化则抛错(防止业务层在装配前误用)。 */
export function getSyncAdapter(): SyncAdapter {
  if (!activeAdapter) {
    throw new Error('[sync] adapter 未初始化, 请先在 main.ts 调用 initSync()');
  }
  return activeAdapter;
}

export * from './types';
