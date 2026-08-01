/** 每日任务与今日完成量。写入 user.state.daily[YYYY-MM-DD]。 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { DailyRecord } from '@/types/domain';
import { useUserStore } from './user';
import { useSettingsStore } from './settings';

/** 今日任务清单(≤4, PAGE-SPECS §1)。 */
export const DAILY_TASKS = [
  { id: 'listening', label: '听解 5 题，先盲听再看原文' },
  { id: 'reading', label: '读解 1 篇，先看设问再读正文' },
  { id: 'examples', label: '例文 10 条，跟读一遍' },
  { id: 'review', label: '回收昨天的错题' },
] as const;

/** 本地日期键 YYYY-MM-DD(与旧版一致)。 */
export function todayKey(now: Date = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export const useDailyStore = defineStore('daily', () => {
  const user = useUserStore();
  const settings = useSettingsStore();
  /** 跨零点时手动刷新用; 也让 today 在切天后可被重新计算。 */
  const dayKey = ref(todayKey());

  function ensureToday(): DailyRecord {
    const key = dayKey.value;
    let record = user.state.daily[key];
    if (!record) {
      record = { done: {}, tasks: {} };
      user.state.daily[key] = record;
    }
    return record;
  }

  const today = computed<DailyRecord>(() => user.state.daily[dayKey.value] ?? { done: {}, tasks: {} });
  const doneCount = computed(() => Object.keys(today.value.done).length);
  const target = computed(() => settings.dailyTarget);
  const progress = computed(() =>
    target.value <= 0 ? 0 : Math.min(1, doneCount.value / target.value),
  );
  const remaining = computed(() => Math.max(0, target.value - doneCount.value));
  const taskDoneCount = computed(
    () => DAILY_TASKS.filter((t) => today.value.tasks[t.id]).length,
  );

  /** 学习连续天数(有完成记录即算)。 */
  const streakDays = computed(() => {
    let n = 0;
    const cursor = new Date();
    for (;;) {
      const record = user.state.daily[todayKey(cursor)];
      if (!record || Object.keys(record.done).length === 0) break;
      n += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return n;
  });

  /** 答题后登记(key = answerKey)。 */
  function markDone(key: string): void {
    dayKey.value = todayKey();
    ensureToday().done[key] = true;
  }

  function isTaskDone(taskId: string): boolean {
    return Boolean(today.value.tasks[taskId]);
  }

  function toggleTask(taskId: string): void {
    dayKey.value = todayKey();
    const record = ensureToday();
    if (record.tasks[taskId]) delete record.tasks[taskId];
    else record.tasks[taskId] = true;
  }

  return {
    dayKey,
    today,
    doneCount,
    target,
    progress,
    remaining,
    taskDoneCount,
    streakDays,
    markDone,
    isTaskDone,
    toggleTask,
  };
});
