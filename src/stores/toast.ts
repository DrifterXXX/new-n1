/**
 * 全局 Toast 队列(UI 状态, 与业务解耦)。
 * 支持「撤销」行动按钮(错题清空用, PAGE-SPECS §0.8)。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastTone = 'info' | 'success' | 'danger';

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface ToastItem {
  id: number;
  text: string;
  tone: ToastTone;
  action?: ToastAction;
}

const DEFAULT_DURATION = 4200;
let seq = 0;

export const useToastStore = defineStore('toast', () => {
  const items = ref<ToastItem[]>([]);
  const timers = new Map<number, ReturnType<typeof setTimeout>>();

  function dismiss(id: number): void {
    items.value = items.value.filter((t) => t.id !== id);
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
  }

  function push(
    text: string,
    tone: ToastTone = 'info',
    action?: ToastAction,
    duration: number = DEFAULT_DURATION,
  ): number {
    seq += 1;
    const id = seq;
    items.value = [...items.value, { id, text, tone, action }];
    timers.set(
      id,
      setTimeout(() => dismiss(id), duration),
    );
    return id;
  }

  const info = (text: string): number => push(text, 'info');
  const success = (text: string): number => push(text, 'success');
  const danger = (text: string): number => push(text, 'danger');

  return { items, push, dismiss, info, success, danger };
});
