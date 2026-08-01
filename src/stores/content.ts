/**
 * 只读题库 store: 加载一次 + 缓存 + 选择器。
 * 归一化在 content-service 完成(answer 已 0-based), 这里只做筛选/检索/取数。
 */
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { loadContent } from '@/services/content-service';
import type { ContentBundle, Example, ListeningQuestion, Reading } from '@/types/domain';

export const useContentStore = defineStore('content', () => {
  // 题库为冻结的大对象, 用 shallowRef 避免无意义的深度响应式代理。
  const bundle = shallowRef<ContentBundle | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load(): Promise<void> {
    if (bundle.value || loading.value) return;
    loading.value = true;
    error.value = null;
    try {
      bundle.value = await loadContent();
    } catch {
      error.value = '题库加载失败，请刷新页面重试';
    } finally {
      loading.value = false;
    }
  }

  const ready = computed(() => bundle.value !== null);
  const examples = computed<Example[]>(() => bundle.value?.examples ?? []);
  const listening = computed<ListeningQuestion[]>(() => bundle.value?.listening ?? []);
  const readings = computed<Reading[]>(() => bundle.value?.readings ?? []);

  const readingQuestionCount = computed(() =>
    readings.value.reduce((sum, r) => sum + r.questions.length, 0),
  );

  function listeningByType(type: string): ListeningQuestion[] {
    if (!type || type === 'all') return listening.value;
    return listening.value.filter((q) => q.type === type);
  }

  function readingsByType(type: string): Reading[] {
    if (!type || type === 'all') return readings.value;
    return readings.value.filter((r) => r.type === type);
  }

  function searchExamples(keyword: string): Example[] {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return examples.value;
    return examples.value.filter((e) =>
      [e.jp, e.cn, e.grammar, e.vocab].some((f) => f.toLowerCase().includes(kw)),
    );
  }

  function exampleById(id: number): Example | undefined {
    return examples.value.find((e) => e.id === id);
  }
  function listeningById(id: number): ListeningQuestion | undefined {
    return listening.value.find((q) => q.id === id);
  }
  function readingById(id: number): Reading | undefined {
    return readings.value[id];
  }

  return {
    bundle,
    loading,
    error,
    ready,
    examples,
    listening,
    readings,
    readingQuestionCount,
    load,
    listeningByType,
    readingsByType,
    searchExamples,
    exampleById,
    listeningById,
    readingById,
  };
});
