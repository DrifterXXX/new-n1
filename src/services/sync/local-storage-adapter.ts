/**
 * 默认 SyncAdapter: localStorage 实现。
 * - 读写键 STORE_KEY = 'n1-center-v1'(与旧版单文件应用一致, 现有用户进度无缝迁移)。
 * - revision 存于同键的伴随记录, 每次 push 自增, 为将来冲突检测占位。
 * - subscribe 监听 window 'storage' 事件实现跨标签页同步。
 */
import type { SyncAdapter, SyncResult } from './types';
import type { UserState } from '@/types/domain';
import { migrate } from './migrations';
import { STORE_KEY, SYNC_META_KEY } from '@/constants';

interface SyncMeta {
  revision: number;
  syncedAt: number;
}

function readMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    if (raw) {
      const m = JSON.parse(raw) as Partial<SyncMeta>;
      return { revision: m.revision ?? 0, syncedAt: m.syncedAt ?? 0 };
    }
  } catch {
    /* ignore */
  }
  return { revision: 0, syncedAt: 0 };
}

function writeMeta(meta: SyncMeta): void {
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
}

function readState(): UserState {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return migrate(null);
  try {
    return migrate(JSON.parse(raw));
  } catch {
    return migrate(null);
  }
}

export function createLocalStorageAdapter(): SyncAdapter {
  return {
    name: 'local-storage',

    async init(): Promise<void> {
      // 读一次触发迁移并回写规范化后的结构(幂等)。
      const state = readState();
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      if (!localStorage.getItem(SYNC_META_KEY)) {
        writeMeta({ revision: 0, syncedAt: Date.now() });
      }
    },

    async pull(): Promise<SyncResult> {
      const state = readState();
      const meta = readMeta();
      return { state, revision: meta.revision, syncedAt: meta.syncedAt };
    },

    async push(state: UserState): Promise<SyncResult> {
      const meta = readMeta();
      const next: SyncMeta = { revision: meta.revision + 1, syncedAt: Date.now() };
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      writeMeta(next);
      return { state, revision: next.revision, syncedAt: next.syncedAt };
    },

    subscribe(onChange: (r: SyncResult) => void): () => void {
      const handler = (e: StorageEvent) => {
        if (e.key !== STORE_KEY) return;
        const state = readState();
        const meta = readMeta();
        onChange({ state, revision: meta.revision, syncedAt: meta.syncedAt });
      };
      window.addEventListener('storage', handler);
      return () => window.removeEventListener('storage', handler);
    },

    async clear(): Promise<void> {
      localStorage.removeItem(STORE_KEY);
      localStorage.removeItem(SYNC_META_KEY);
    },
  };
}
