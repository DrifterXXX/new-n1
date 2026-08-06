<script setup lang="ts">
/**
 * 汉字学习: 浏览/卡片/选择题 三模式入口。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AppButton from '@/components/common/AppButton.vue';
import AppIcon from '@/components/common/AppIcon.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import Pager from '@/components/common/Pager.vue';
import SkeletonBlock from '@/components/common/SkeletonBlock.vue';
import KanjiCard from '@/components/question/KanjiCard.vue';
import KanjiQuiz from '@/components/question/KanjiQuiz.vue';
import { usePagination } from '@/composables/usePagination';
import { PER_PAGE } from '@/constants';
import { useKanjiStore } from '@/stores/kanji';

type ViewMode = 'browse' | 'card' | 'quiz' | 'review';

const kanji = useKanjiStore();
const mode = ref<ViewMode>('browse');

/* ---------- 今天复习 ---------- */
const reviewIndex = ref(0);
const reviewRevealed = ref(false);
const reviewFinished = ref(false);

const currentReviewCard = computed(() => kanji.dueKanji[reviewIndex.value]);

function startReview(): void {
  reviewIndex.value = 0;
  reviewRevealed.value = false;
  reviewFinished.value = false;
  mode.value = 'review';
}

function reviewReveal(): void {
  reviewRevealed.value = true;
}

function reviewRate(rating: '认识' | '模糊' | '不认识'): void {
  const entry = currentReviewCard.value;
  if (!entry) return;
  kanji.recordSelfRating(entry, rating === '认识', rating);
  if (reviewIndex.value < kanji.dueKanji.length - 1) {
    reviewIndex.value++;
    reviewRevealed.value = false;
  } else {
    reviewFinished.value = true;
  }
}

/* ---------- 搜索 ---------- */
const input = ref('');
const keyword = ref('');
let timer: ReturnType<typeof setTimeout> | null = null;

watch(input, (value) => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    keyword.value = value;
  }, 200);
});

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});

const matched = computed(() => kanji.search(keyword.value));
const pager = usePagination(matched, PER_PAGE.kanji, keyword);

function clearSearch(): void {
  input.value = '';
  keyword.value = '';
}

onMounted(() => {
  kanji.load();
});
</script>

<template>
  <div class="view">
    <div class="mode-bar card">
      <AppButton :active="mode === 'browse'" icon="search" @click="mode = 'browse'">
        浏览
      </AppButton>
      <AppButton :active="mode === 'card'" icon="layers" @click="mode = 'card'">
        卡片
      </AppButton>
      <AppButton :active="mode === 'quiz'" icon="dumbbell" @click="mode = 'quiz'">
        选择题
      </AppButton>
      <AppButton
        :active="mode === 'review'"
        icon="rotate-ccw"
        @click="startReview"
      >
        今天复习{{ kanji.dueKanji.length > 0 ? ` (${kanji.dueKanji.length})` : '' }}
      </AppButton>
    </div>

    <!-- 浏览 -->
    <template v-if="mode === 'browse'">
      <div class="main">
        <div class="search card">
          <AppIcon name="search" :size="20" />
          <input
            v-model="input"
            class="search__input"
            type="search"
            placeholder="搜索汉字或读音"
            aria-label="搜索汉字"
          />
          <span class="search__count mono">{{ matched.length }} 条</span>
          <button
            v-if="input"
            type="button"
            class="search__clear"
            aria-label="清空搜索"
            @click="clearSearch"
          >
            <AppIcon name="x" :size="16" />
          </button>
        </div>

        <div v-if="kanji.loading" class="list">
          <div v-for="i in 4" :key="i" class="card skeleton-row">
            <SkeletonBlock height="18px" width="60%" />
            <SkeletonBlock height="14px" width="40%" />
          </div>
        </div>

        <p v-else-if="kanji.error" class="error-line" role="alert">
          {{ kanji.error }}
        </p>

        <EmptyState
          v-else-if="matched.length === 0"
          icon="search"
          title="没有匹配的汉字"
          description="试试更短的关键词，或清空搜索看全部 520 个汉字。"
          action-text="清空搜索"
          action-icon="x"
          @action="clearSearch"
        />

        <div v-else class="list">
          <div
            v-for="item in pager.pageItems.value"
            :key="item.id"
            class="card kanji-row"
          >
            <span class="kanji-row__term jp">{{ item.term }}</span>
            <span class="kanji-row__reading mono">{{ item.reading }}</span>
          </div>
        </div>

        <Pager
          :page="pager.page.value"
          :total-pages="pager.totalPages.value"
          unit="页"
          @first="pager.first"
          @prev="pager.prev"
          @next="pager.next"
          @last="pager.last"
        />
      </div>
    </template>

    <!-- 全局错误: 在任何模式下数据加载失败时显示 -->
    <p v-if="kanji.error && mode !== 'browse'" class="error-line view-error" role="alert">
      {{ kanji.error }}
      <AppButton icon="search" @click="mode = 'browse'">返回浏览</AppButton>
    </p>

    <KanjiCard v-else-if="mode === 'card' && !kanji.error" @back="mode = 'browse'" />
    <KanjiQuiz v-else-if="mode === 'quiz' && !kanji.error" @back="mode = 'browse'" />

    <!-- 今天复习 -->
    <template v-if="mode === 'review'">
      <div v-if="kanji.dueKanji.length === 0" class="review-area">
        <div class="card review-empty">
          <h2 class="section-title">今天没有待复习的汉字</h2>
          <p class="meta">所有汉字都已复习完毕，明天再来看看吧。</p>
          <div class="review-empty__actions">
            <AppButton icon="search" @click="mode = 'browse'">返回浏览</AppButton>
          </div>
        </div>
      </div>
      <div v-else-if="reviewFinished" class="review-area">
        <div class="card review-summary">
          <h2 class="section-title">今天复习完成</h2>
          <p class="meta">共复习 {{ kanji.dueKanji.length }} 个汉字</p>
          <div class="review-summary__actions">
            <AppButton variant="primary" icon="rotate-ccw" @click="startReview">再来一轮</AppButton>
            <AppButton icon="search" @click="mode = 'browse'">返回浏览</AppButton>
          </div>
        </div>
      </div>
      <div v-else-if="currentReviewCard" class="review-area">
        <div class="review-progress">
          <span class="mono">{{ reviewIndex + 1 }} / {{ kanji.dueKanji.length }}</span>
        </div>
        <div
          class="card card-flip"
          :class="{ 'card-flip--revealed': reviewRevealed }"
          @click="reviewReveal"
        >
          <div class="card-flip__inner">
            <div class="card-flip__front">
              <span class="card-flip__term jp">{{ currentReviewCard.term }}</span>
              <span class="card-flip__hint">点击显示读音</span>
            </div>
            <div class="card-flip__back">
              <span class="card-flip__term jp">{{ currentReviewCard.term }}</span>
              <span class="card-flip__reading mono">{{ currentReviewCard.reading }}</span>
            </div>
          </div>
        </div>
        <div v-if="reviewRevealed" class="card-rating">
          <AppButton variant="primary" icon="check" @click="reviewRate('认识')">认识</AppButton>
          <AppButton variant="secondary" icon="circle" @click="reviewRate('模糊')">模糊</AppButton>
          <AppButton variant="danger" icon="x" @click="reviewRate('不认识')">不认识</AppButton>
        </div>
      </div>
    </template>

    <!-- 困难汉字列表 -->
    <div v-if="mode === 'browse' && kanji.kanjiStats.difficult.length > 0" class="card difficult-section">
      <h3 class="section-title">困难汉字（{{ kanji.kanjiStats.difficult.length }}）</h3>
      <ul class="difficult-list">
        <li v-for="item in kanji.kanjiStats.difficult" :key="item.term" class="difficult-row">
          <span class="jp">{{ item.term }}</span>
          <span class="mono reading">{{ item.reading }}</span>
          <span class="mono wrong-count">错 {{ item.wrongCount }} 次</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.mode-bar {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
}

.main {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.search {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  color: var(--color-text-meta);
}

.search__input {
  flex: 1;
  min-width: 0;
  min-height: var(--tap-min);
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--text-base);
  color: var(--color-text);
}

.search__count {
  font-size: var(--text-xs);
  color: var(--color-text-meta);
}

.search__clear {
  display: grid;
  place-items: center;
  min-width: var(--tap-min);
  min-height: var(--tap-min);
  border-radius: var(--radius-pill);
  color: var(--color-text-meta);
}

.search__clear:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.skeleton-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
}

.kanji-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
}

.kanji-row__term {
  font-size: var(--text-lg);
  font-weight: var(--fw-emphasis);
  color: var(--color-text);
  min-width: 120px;
}

.kanji-row__reading {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.error-line {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-danger-strong);
  font-size: var(--text-sm);
}

.view-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  text-align: center;
  margin: var(--space-8) auto;
  max-width: 360px;
}

/* 今天复习 */
.review-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-6) 0;
}

.review-progress {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.review-empty,
.review-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-8);
  max-width: 480px;
  width: 100%;
}

.review-empty__actions,
.review-summary__actions {
  display: flex;
  gap: var(--space-2);
}

/* 困难汉字 */
.difficult-section {
  margin-top: var(--space-4);
  padding: var(--space-4);
}

.difficult-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.difficult-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  font-size: var(--text-sm);
}

.difficult-row .reading {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.difficult-row .wrong-count {
  margin-left: auto;
  color: var(--color-danger-strong);
  font-size: var(--text-xs);
}
</style>