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

type ViewMode = 'browse' | 'card' | 'quiz';

const kanji = useKanjiStore();
const mode = ref<ViewMode>('browse');

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
</style>