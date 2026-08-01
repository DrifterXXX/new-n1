/**
 * 持久化引擎: 唯一持有 UserState、唯一调用 SyncAdapter 的 store。
 * 其余 feature store(progress/favorites/daily/settings)只读写这里的响应式切片。
 * 业务层永远不知道数据存在 localStorage 还是后端(AC-07 依赖倒置)。
 */
import { defineStore } from 'pinia';
import { nextTick, ref, toRaw, watch } from 'vue';
import { createDefaultUserState, type UserState } from '@/types/domain';
import { getSyncAdapter, type SyncAdapter } from '@/services/sync';
import { PERSIST_DEBOUNCE_MS } from '@/constants';

export const useUserStore = defineStore('user', () => {
  /** 全量用户状态(响应式)。 */
  const state = ref<UserState>(createDefaultUserState());
  /** 首次 pull 完成。 */
  const ready = ref(false);
  /** 存储不可用/写入失败时的降级提示(Spec §10)。 */
  const storageError = ref<string | null>(null);

  let adapter: SyncAdapter | null = null;
  let stopExternal: (() => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let suppress = false;

  /** 用外部快照覆盖本地状态(pull / storage 事件 / 导入备份), 期间不回写。 */
  function hydrate(next: UserState): void {
    suppress = true;
    state.value = next;
    void nextTick(() => {
      suppress = false;
    });
  }

  async function persist(): Promise<void> {
    if (!adapter) return;
    try {
      await adapter.push(toRaw(state.value));
      storageError.value = null;
    } catch {
      storageError.value = '本地存储写入失败（可能已写满或被浏览器禁用），本次进度未保存';
    }
  }

  function schedulePersist(): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void persist();
    }, PERSIST_DEBOUNCE_MS);
  }

  watch(
    state,
    () => {
      if (!ready.value || suppress) return;
      schedulePersist();
    },
    { deep: true },
  );

  /** 应用启动时调用一次: 水合 + 订阅外部变更(跨标签页)。 */
  async function init(): Promise<void> {
    try {
      adapter = getSyncAdapter();
      const result = await adapter.pull();
      hydrate(result.state);
      stopExternal = adapter.subscribe((r) => hydrate(r.state));
      storageError.value = null;
    } catch {
      storageError.value = '本地存储不可用，本次学习记录不会被保存';
    } finally {
      ready.value = true;
    }
  }

  /** 立即落盘(导出备份前 / 页面卸载前)。 */
  async function flush(): Promise<void> {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    await persist();
  }

  /** 重新从存储拉取(导入备份后刷新 UI)。 */
  async function refresh(): Promise<void> {
    if (!adapter) return;
    const result = await adapter.pull();
    hydrate(result.state);
  }

  function dispose(): void {
    stopExternal?.();
    stopExternal = null;
  }

  return { state, ready, storageError, init, flush, refresh, hydrate, dispose };
});
