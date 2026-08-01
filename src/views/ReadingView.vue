<script setup lang="ts">
/** 读解题库: 题型过滤 + 每页一篇(PER_PAGE=1) + 侧栏动作清单。 */
import { computed, ref } from 'vue';
import AppIcon from '@/components/common/AppIcon.vue';
import Chip from '@/components/common/Chip.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import Pager from '@/components/common/Pager.vue';
import SkeletonBlock from '@/components/common/SkeletonBlock.vue';
import ReadingArticle from '@/components/question/ReadingArticle.vue';
import { usePagination } from '@/composables/usePagination';
import { PER_PAGE, READING_TYPES } from '@/constants';
import { useContentStore } from '@/stores/content';

const content = useContentStore();

const type = ref<string>('all');
const tabs = computed(() => [
  { key: 'all', label: '全部', count: content.readings.length },
  ...READING_TYPES.map((t) => ({
    key: t as string,
    label: t as string,
    count: content.readingsByType(t).length,
  })),
]);

const filtered = computed(() => content.readingsByType(type.value));
const pager = usePagination(filtered, PER_PAGE.reading, type);
const current = computed(() => pager.pageItems.value[0] ?? null);
</script>

<template>
  <div class="view view-split">
    <div class="main">
      <div class="tabs" role="group" aria-label="读解题型过滤">
        <Chip
          v-for="tab in tabs"
          :key="tab.key"
          :label="tab.label"
          :count="tab.count"
          :active="type === tab.key"
          @click="type = tab.key"
        />
      </div>

      <div v-if="content.loading" class="card skeleton-card">
        <SkeletonBlock height="20px" width="46%" />
        <SkeletonBlock height="14px" :lines="6" />
      </div>

      <p v-else-if="content.error" class="error-line" role="alert">{{ content.error }}</p>

      <EmptyState
        v-else-if="!current"
        icon="file-text"
        title="这个题型下暂时没有文章"
        description="全部 30 篇覆盖 6 种题型，切回「全部」继续读。"
        action-text="看全部读解"
        action-icon="arrow-right"
        @action="type = 'all'"
      />

      <ReadingArticle v-else :key="current.id" :reading="current" />

      <Pager
        :page="pager.page.value"
        :total-pages="pager.totalPages.value"
        unit="篇"
        @first="pager.first"
        @prev="pager.prev"
        @next="pager.next"
        @last="pager.last"
      />
    </div>

    <aside class="card side">
      <h2 class="panel__title"><AppIcon name="file-text" :size="16" />读解三步动作</h2>
      <ol class="steps">
        <li><span class="steps__no mono">1</span>先看设问，明确要找什么。</li>
        <li><span class="steps__no mono">2</span>抓首尾段与转折词（しかし・つまり）。</li>
        <li><span class="steps__no mono">3</span>情報検索题直接按条件定位，不要通读。</li>
      </ol>
      <p class="meta">統合理解请对照 A / B 两文的立场差异，再回设问选。</p>
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

.tabs {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding-bottom: var(--space-1);
}

.skeleton-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-6);
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
