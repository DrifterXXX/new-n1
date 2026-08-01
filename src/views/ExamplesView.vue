<script setup lang="ts">
/** 文法词汇: 实时搜索(防抖 200ms) + 命中高亮 + 例文行(音频/收藏) + 分页。 */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import AppIcon from '@/components/common/AppIcon.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import Pager from '@/components/common/Pager.vue';
import SkeletonBlock from '@/components/common/SkeletonBlock.vue';
import ExampleRow from '@/components/question/ExampleRow.vue';
import { usePagination } from '@/composables/usePagination';
import { PER_PAGE } from '@/constants';
import { useContentStore } from '@/stores/content';

const content = useContentStore();

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

const matched = computed(() => content.searchExamples(keyword.value));
const pager = usePagination(matched, PER_PAGE.examples, keyword);

function clear(): void {
  input.value = '';
  keyword.value = '';
}
</script>

<template>
  <div class="view view-split">
    <div class="main">
      <div class="search card">
        <AppIcon name="search" :size="20" />
        <input
          v-model="input"
          class="search__input"
          type="search"
          placeholder="搜索日文、中文、文法或词汇"
          aria-label="搜索例文"
        />
        <span class="search__count mono">{{ matched.length }} 条</span>
        <button v-if="input" type="button" class="search__clear" aria-label="清空搜索" @click="clear">
          <AppIcon name="x" :size="16" />
        </button>
      </div>

      <div v-if="content.loading" class="list">
        <div v-for="i in 4" :key="i" class="card skeleton-row">
          <SkeletonBlock height="18px" width="72%" />
          <SkeletonBlock height="14px" width="46%" />
        </div>
      </div>

      <p v-else-if="content.error" class="error-line" role="alert">{{ content.error }}</p>

      <EmptyState
        v-else-if="matched.length === 0"
        icon="search"
        title="没有匹配例文，试试更短的关键词"
        description="例如只搜一个文法点「にほかならない」，或直接清空看全部 200 条。"
        action-text="清空搜索"
        action-icon="x"
        @action="clear"
      />

      <div v-else class="list">
        <ExampleRow
          v-for="item in pager.pageItems.value"
          :key="item.id"
          :example="item"
          :keyword="keyword"
        />
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

    <aside class="card side">
      <h2 class="panel__title"><AppIcon name="book-open" :size="16" />例文怎么用</h2>
      <ol class="steps">
        <li><span class="steps__no mono">1</span>先读日文，遮住中文猜意思。</li>
        <li><span class="steps__no mono">2</span>点「再生」跟读一遍，注意停顿与语调。</li>
        <li><span class="steps__no mono">3</span>把拿不准的收藏起来，考前只看收藏。</li>
      </ol>
      <p class="meta">搜索支持日文原文、中文译文、文法名与词汇，命中处会高亮。</p>
    </aside>
  </div>
</template>

<style scoped>
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
  gap: var(--space-3);
}

.skeleton-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
}

.side {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5);
  position: sticky;
  top: calc(var(--space-16) + var(--space-4));
}

.panel__title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-base);
  font-weight: var(--fw-emphasis);
  color: var(--color-text);
}

.steps {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  font-size: var(--text-sm);
  line-height: var(--leading-body);
  color: var(--color-text-2);
}

.steps li {
  display: flex;
  gap: var(--space-2);
}

.steps__no {
  flex: none;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: var(--text-xs);
}

.error-line {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-danger-strong);
  font-size: var(--text-sm);
}

@media (max-width: 960px) {
  .side {
    position: static;
    order: -1;
  }
}
</style>
