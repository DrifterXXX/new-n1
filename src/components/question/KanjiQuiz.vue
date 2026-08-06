<script setup lang="ts">
/**
 * 汉字选择题: 20 题 MC, term→reading 和 reading→term 混合, 答完显示小结。
 */
import { computed, onMounted, ref } from 'vue';
import AppButton from '@/components/common/AppButton.vue';
import { useKanjiStore } from '@/stores/kanji';
import type { KanjiQuiz } from '@/services/kanji-service';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const QUIZ_SIZE = 20;
const kanji = useKanjiStore();

const questions = ref<KanjiQuiz[]>([]);
const quizIndex = ref(0);
const answers = ref<boolean[]>([]);
const finished = ref(false);
const started = ref(false);

function start(): void {
  // Guard: prevent re-entrant start while already running
  if (started.value && !finished.value) return;

  const qs: KanjiQuiz[] = [];
  for (let i = 0; i < QUIZ_SIZE; i++) {
    const dir: 'term→reading' | 'reading→term' =
      i % 2 === 0 ? 'term→reading' : 'reading→term';
    const q = kanji.generateQuizFor(dir);
    if (!q) {
      // 数据未就绪，跳过
      continue;
    }
    qs.push(q);
  }
  questions.value = qs;
  quizIndex.value = 0;
  answers.value = [];
  finished.value = false;
  started.value = true;
}

onMounted(() => {
  start();
});

const current = computed(() => questions.value[quizIndex.value]);

function answer(chosen: number): void {
  const q = current.value;
  if (!q) return;
  const correct = chosen === q.correctIndex;
  answers.value.push(correct);
  kanji.recordQuizAnswer(q, chosen);
  if (quizIndex.value < QUIZ_SIZE - 1) {
    quizIndex.value++;
  } else {
    finished.value = true;
  }
}

const correctCount = computed(() => answers.value.filter(Boolean).length);
const rate = computed(() =>
  answers.value.length === 0
    ? 0
    : Math.round((correctCount.value / answers.value.length) * 100),
);
</script>

<template>
  <div v-if="questions.length === 0" class="quiz-area">
    <div class="card summary">
      <h2 class="section-title">数据加载中</h2>
      <p class="meta">汉字数据尚未就绪，请稍后再试。</p>
      <div class="summary__actions">
        <AppButton icon="search" @click="emit('back')">返回浏览</AppButton>
      </div>
    </div>
  </div>
  <div v-else class="quiz-area">
    <div v-if="!finished && current" class="quiz-card card">
      <div class="quiz-progress">
        <span class="mono">{{ quizIndex + 1 }} / {{ QUIZ_SIZE }}</span>
      </div>
      <p class="quiz-direction meta">
        {{ current.direction === 'term→reading' ? '选择读音' : '选择汉字' }}
      </p>
      <p class="quiz-question jp">{{ current.question }}</p>
      <div class="quiz-options">
        <button
          v-for="(opt, i) in current.options"
          :key="i"
          type="button"
          class="quiz-option card"
          @click="answer(i)"
        >
          <span class="quiz-option__index mono">{{ i + 1 }}</span>
          <span class="quiz-option__text jp">{{ opt }}</span>
        </button>
      </div>
    </div>

    <div v-if="finished" class="card summary">
      <h2 class="section-title">选择题完成</h2>
      <div class="summary__grid">
        <p>
          <span class="mono summary__num">{{ correctCount }}</span>
          <span class="meta">答对</span>
        </p>
        <p>
          <span class="mono summary__num">{{ QUIZ_SIZE - correctCount }}</span>
          <span class="meta">答错</span>
        </p>
        <p>
          <span class="mono summary__num">{{ rate }}%</span>
          <span class="meta">正确率</span>
        </p>
      </div>
      <div class="summary__actions">
        <AppButton variant="primary" icon="dumbbell" @click="start">
          再来一组
        </AppButton>
        <AppButton icon="search" @click="emit('back')">
          返回浏览
        </AppButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.quiz-card {
  width: 100%;
  max-width: 480px;
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.quiz-progress {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  text-align: center;
}

.quiz-direction {
  text-align: center;
  font-size: var(--text-sm);
}

.quiz-question {
  font-size: var(--text-2xl);
  font-weight: var(--fw-bold);
  text-align: center;
  color: var(--color-text);
  padding: var(--space-4) 0;
}

.quiz-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.quiz-option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease),
    border-color var(--motion-fast) var(--ease);
}

.quiz-option:hover {
  background: var(--color-surface-2);
  border-color: var(--color-border-strong);
}

.quiz-option__index {
  flex: none;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.quiz-option__text {
  flex: 1;
  font-size: var(--text-base);
}

.summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-6);
  max-width: 480px;
  width: 100%;
}

.summary__grid {
  display: flex;
  gap: var(--space-8);
}

.summary__grid p {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.summary__num {
  font-size: var(--text-3xl);
  line-height: var(--leading-tight);
  color: var(--color-text);
}

.summary__actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
</style>