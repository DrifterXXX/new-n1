/**
 * kanji 汉字学习 store: 加载 + 搜索 + 选择题生成 + 自评记录。
 * 使用 content-service 风格的动态 import 模式。
 * 自评记录通过 progress store 的 record() 写入, kind='kanji'。
 */
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import {
  generateQuiz,
  kanjiNumericId,
  loadKanji,
  searchKanji,
  type KanjiEntry,
  type KanjiQuiz,
} from '@/services/kanji-service';
import { useProgressStore } from './progress';

export const useKanjiStore = defineStore('kanji', () => {
  const entries = shallowRef<readonly KanjiEntry[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const ready = computed(() => entries.value.length > 0);

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
   */
  function recordSelfRating(
    entry: KanjiEntry,
    correct: boolean,
  ): void {
    const progress = useProgressStore();
    progress.record({
      kind: 'kanji',
      id: kanjiNumericId(entry.id),
      chosen: correct ? 0 : 1,
      correct,
      meta: { title: entry.term },
    });
  }

  /**
   * 记录选择题的实际作答选项。
   * chosen 为用户实际选择的选项下标(0-based), 与 quiz.correctIndex 对比得出正确性。
   */
  function recordQuizAnswer(
    quiz: KanjiQuiz,
    chosen: number,
  ): void {
    const progress = useProgressStore();
    progress.record({
      kind: 'kanji',
      id: kanjiNumericId(quiz.entry.id),
      chosen,
      correct: chosen === quiz.correctIndex,
      meta: { title: quiz.entry.term },
    });
  }

  return {
    entries,
    loading,
    error,
    ready,
    load,
    search,
    generateQuizFor,
    recordSelfRating,
    recordQuizAnswer,
  };
});