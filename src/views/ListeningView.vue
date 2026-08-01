<script setup lang="ts">
/** 听解题库: 题型过滤 + 题卡(整段音频/倍速/选项听钮/原文后置) + 分页。 */
import { computed, onBeforeUnmount, ref } from 'vue';
import AppIcon from '@/components/common/AppIcon.vue';
import Chip from '@/components/common/Chip.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import Pager from '@/components/common/Pager.vue';
import SkeletonBlock from '@/components/common/SkeletonBlock.vue';
import ListeningCard from '@/components/question/ListeningCard.vue';
import { usePagination } from '@/composables/usePagination';
import { LISTENING_TYPES, PER_PAGE } from '@/constants';
import { useAudioStore } from '@/stores/audio';
import { useContentStore } from '@/stores/content';

const content = useContentStore();
const audio = useAudioStore();

const type = ref<string>('all');
const tabs = computed(() => [
  { key: 'all', label: '全部', count: content.listening.length },
  ...LISTENING_TYPES.map((t) => ({ key: t as string, label: t as string, count: content.listeningByType(t).length })),
]);

const filtered = computed(() => content.listeningByType(type.value));
const pager = usePagination(filtered, PER_PAGE.listening, type);

function switchType(next: string): void {
  audio.stop();
  type.value = next;
}

onBeforeUnmount(() => audio.stop());
</script>

<template>
  <div class="view view-split">
    <div class="main">
      <div class="tabs" role="group" aria-label="听解题型过滤">
        <Chip
          v-for="tab in tabs"
          :key="tab.key"
          :label="tab.label"
          :count="tab.count"
          :active="type === tab.key"
          @click="switchType(tab.key)"
        />
      </div>

      <div v-if="content.loading" class="list">
        <div v-for="i in 3" :key="i" class="card skeleton-card">
          <SkeletonBlock height="16px" width="38%" />
          <SkeletonBlock height="14px" :lines="3" />
        </div>
      </div>

      <p v-else-if="content.error" class="error-line" role="alert">{{ content.error }}</p>

      <EmptyState
        v-else-if="filtered.length === 0"
        icon="headphones"
        title="这个题型下暂时没有题目"
        description="切回「全部」看看其他题型，或先去做一组混合训练。"
        action-text="看全部听解题"
        action-icon="arrow-right"
        @action="switchType('all')"
      />

      <div v-else class="list">
        <ListeningCard v-for="q in pager.pageItems.value" :key="q.id" :question="q" />
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
      <h2 class="panel__title"><AppIcon name="headphones" :size="16" />听解怎么练</h2>
      <ul class="rules">
        <li><span class="dot" />第一遍盲听抓结论，别急着看选项。</li>
        <li><span class="dot" />即時応答只有一句，注意语气与敬体。</li>
        <li><span class="dot" />精听用 0.75 倍速，泛听用 1.25 倍速。</li>
        <li><span class="dot" />答完再展开原文，逐句对照漏听的地方。</li>
      </ul>
      <p class="meta">真人音频缺失时会自动切浏览器朗读，并给出提示。</p>
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

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.skeleton-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5);
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

.rules {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  font-size: var(--text-sm);
  line-height: var(--leading-body);
  color: var(--color-text-2);
}

.rules li {
  display: flex;
  gap: var(--space-2);
}

.dot {
  flex: none;
  width: 6px;
  height: 6px;
  margin-top: 8px;
  border-radius: var(--radius-pill);
  background: var(--color-primary);
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
