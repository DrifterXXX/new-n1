/**
 * kanji 汉字学习 store: 加载 + 搜索 + 选择题生成 + 自评记录。
 * 使用 content-service 风格的动态 import 模式。
 * 自评记录通过 progress store 的 record() 写入, kind='kanji'。
 */
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { generateQuiz,
  loadKanji,
  searchKanji,
  type KanjiEntry,
  type KanjiQuiz,
} from '@/services/kanji-service';
import {
  getDueKanji,
  kanjiDifficultStats,
  kanjiNumericId,
  type KanjiRating,
  type KanjiStats,
} from '@/services/kanji-srs';
import { useProgressStore } from './progress';
import { useUserStore } from './user';

export const useKanjiStore = defineStore('kanji', () => {
  const entries = shallowRef<readonly KanjiEntry[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const ready = computed(() => entries.value.length > 0);

  const user = computed(() => useUserStore());

  /** 当前待复习的汉字队列(按 nextReviewAt 升序, 其次 id 升序)。 */
  const dueKanji = computed(() => {
    if (!ready.value) return [];
    return getDueKanji(entries.value, user.value.state.answers);
  });

  /** 汉字学习统计。 */
  const kanjiStats = computed<KanjiStats>(() => {
    if (!ready.value) {
      return { totalStudied: 0, dueToday: 0, mastered: 0, accuracy: 0, difficult: [] };
    }
    return kanjiDifficultStats(entries.value, user.value.state.answers);
  });

  async function load(): Promise<void> {
    if (ready.value || loading.value) return;
    loading.value = true;
    error.value = null;
    try {
      entries.value = await loadKanji();
    } catch {
      error.value = '汉字数据加载失败，请刷新页面重试';
    } finally {
      loading.value = false;
    }
  }

  function search(keyword: string): KanjiEntry[] {
    return searchKanji(entries.value, keyword);
  }

  function generateQuizFor(
    direction: 'term→reading' | 'reading→term',
  ): KanjiQuiz | null {
    if (entries.value.length === 0) return null;
    return generateQuiz(entries.value, direction);
  }

  /**
   * 记录自评结果。
   * 使用 kanji 的 numeric id 与 progress store 兼容。
   * correct=true 表示"认识", false 表示"模糊/不认识"。
   * 同时根据 rating 计算间隔复习时间。
   */
  function recordSelfRating(
    entry: KanjiEntry,
    correct: boolean,
    rating: KanjiRating = correct ? '认识' : '模糊',
  ): void {
    const progress = useProgressStore();
    progress.record({
      kind: 'kanji',
      id: kanjiNumericId(entry.id),
      chosen: correct ? 0 : 1,
      correct,
      meta: { title: entry.term },
      kanjiRating: rating,
    });
  }

  /**
   * 记录选择题的实际作答选项。
   * chosen 为用户实际选择的选项下标(0-based), 与 quiz.correctIndex 对比得出正确性。
   *
   * SRS rating 推导: 选择题答对 => '认识', 答错 => '模糊'。
   * 推导原则: 选择题的"正确/错误"等价于自评的"认识/模糊"。
   * - 答对('认识'): 用户展示了对该汉字的掌握, 应延长复习间隔。
   * - 答错('模糊'): 用户尚未完全掌握, 应缩短复习间隔(次日复习)。
   * 不映射为'不认识'因为选择题四选一即使蒙对也可能选错, 且答错不代表完全陌生,
   * 使用'模糊'作为中间等级更符合 SRS 渐进复习策略。
   * 此 rating 被 progress.record() 用于 computeNextReview() 计算 nextReviewAt。
   */
  function recordQuizAnswer(
    quiz: KanjiQuiz,
    chosen: number,
  ): void {
    const progress = useProgressStore();
    const correct = chosen === quiz.correctIndex;
    const rating: KanjiRating = correct ? '认识' : '模糊';
    progress.record({
      kind: 'kanji',
      id: kanjiNumericId(quiz.entry.id),
      chosen,
      correct,
      meta: { title: quiz.entry.term },
      kanjiRating: rating,
    });
  }

  return {
    entries,
    loading,
    error,
    ready,
    dueKanji,
    kanjiStats,
    load,
    search,
    generateQuizFor,
    recordSelfRating,
    recordQuizAnswer,
  };
});