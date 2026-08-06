<script setup lang="ts">
/** 错题本: 错题 / 最近 / 收藏三态回收。清空为破坏性操作(二次确认 + 可撤销)。 */
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppButton from '@/components/common/AppButton.vue';
import Chip from '@/components/common/Chip.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import ModalConfirm from '@/components/common/ModalConfirm.vue';
import Pager from '@/components/common/Pager.vue';
import ReviewItem from '@/components/question/ReviewItem.vue';
import type { ReviewRow } from '@/components/question/ReviewItem.vue';
import { usePagination } from '@/composables/usePagination';
import { PER_PAGE, ROUTE_NAMES } from '@/constants';
import { useContentStore } from '@/stores/content';
import { useFavoritesStore } from '@/stores/favorites';
import { useProgressStore } from '@/stores/progress';
import { useSessionStore } from '@/stores/session';
import { useToastStore } from '@/stores/toast';
import { useKanjiStore } from '@/stores/kanji';
import { findEntryById } from '@/services/kanji-srs';
import type { ContentKind } from '@/types/domain';

const router = useRouter();
const content = useContentStore();
const progress = useProgressStore();
const favorites = useFavoritesStore();
const session = useSessionStore();
const toast = useToastStore();
const kanji = useKanjiStore();

// 确保汉字数据已加载, 用于错题本显示
if (!kanji.ready) kanji.load();

const tab = ref<'wrong' | 'recent' | 'fav'>('wrong');
const confirming = ref(false);

/** 从题库回填题干文本与正解, 题目缺失时容错为占位说明。 */
function describe(
  kind: ContentKind,
  id: number,
  sub: number | null,
): { text: string; answer: number | null; type: string } {
  if (kind === 'listening') {
    const q = content.listeningById(id);
    if (!q) return { text: `听解 No.${id}（题目已不在题库中）`, answer: null, type: '听解' };
    return { text: q.question || q.script.slice(0, 48), answer: q.answer, type: q.type };
  }
  if (kind === 'reading') {
    const r = content.readingById(id);
    const q = sub === null ? undefined : r?.questions[sub];
    if (!r) return { text: `读解 第 ${id + 1} 篇（已不在题库中）`, answer: null, type: '读解' };
    return {
      text: `${r.title || `第 ${r.id + 1} 篇`}　問${(sub ?? 0) + 1}　${q?.question ?? ''}`,
      answer: q?.answer ?? null,
      type: r.type,
    };
  }
  if (kind === 'kanji') {
    const entry = findEntryById(kanji.entries, id);
    if (entry) {
      return { text: `${entry.term}（${entry.reading}）`, answer: null, type: '汉字' };
    }
    return { text: `汉字 No.${id}`, answer: null, type: '汉字' };
  }
  const e = content.exampleById(id);
  return { text: e?.jp ?? `例文 No.${id}`, answer: null, type: '例文' };
}

const rows = computed<ReviewRow[]>(() => {
  if (tab.value === 'fav') {
    return favorites.all.map(({ key, record }) => {
      const d = describe(record.kind, record.id, null);
      return {
        key,
        kind: record.kind,
        id: record.id,
        sub: null,
        typeLabel: d.type,
        text: d.text,
        correct: null,
        chosen: null,
        answer: null,
        note: '',
        at: record.at,
      };
    });
  }
  const source = tab.value === 'wrong' ? progress.wrongEntries : progress.recentEntries;
  return source.map(({ key, record }) => {
    const d = describe(record.kind, record.id, record.sub);
    return {
      key,
      kind: record.kind,
      id: record.id,
      sub: record.sub,
      typeLabel: d.type,
      text: d.text,
      correct: record.correct,
      chosen: record.chosen,
      answer: d.answer,
      note: record.meta.note ?? '',
      at: record.at,
    };
  });
});

const pager = usePagination(rows, PER_PAGE.review, tab);

function doClear(): void {
  const count = progress.clearWrong();
  confirming.value = false;
  if (count === 0) return;
  toast.push(`已清空 ${count} 条错题记录`, 'danger', {
    label: '撤销',
    run: () => {
      const back = progress.undoClearWrong();
      toast.success(`已恢复 ${back} 条错题记录`);
    },
  });
}

async function retrain(): Promise<void> {
  session.start('wrong');
  await router.push({ name: ROUTE_NAMES.train });
}

async function toTrain(): Promise<void> {
  session.start('mixed');
  await router.push({ name: ROUTE_NAMES.train });
}

async function toExamples(): Promise<void> {
  await router.push({ name: ROUTE_NAMES.examples });
}
</script>

<template>
  <div class="view">
    <header class="head">
      <div class="tabs" role="group" aria-label="错题本过滤">
        <Chip label="错题" :count="progress.wrongCount" :active="tab === 'wrong'" @click="tab = 'wrong'" />
        <Chip label="最近" :count="progress.total" :active="tab === 'recent'" @click="tab = 'recent'" />
        <Chip label="收藏" :count="favorites.count" :active="tab === 'fav'" @click="tab = 'fav'" />
      </div>
      <div class="head__actions">
        <AppButton icon="rotate-ccw" :disabled="progress.wrongCount === 0" @click="retrain">
          再练一次
        </AppButton>
        <AppButton
          variant="danger"
          icon="trash-2"
          :disabled="progress.wrongCount === 0"
          @click="confirming = true"
        >
          清空错题
        </AppButton>
      </div>
    </header>

    <EmptyState
      v-if="rows.length === 0 && tab === 'wrong'"
      icon="rotate-ccw"
      title="今天没有错题，去训练积累"
      description="连对 3 次的题会自动移出回收池，所以这里空着是好事。"
      action-text="做一组混合训练"
      @action="toTrain"
    />
    <EmptyState
      v-else-if="rows.length === 0 && tab === 'recent'"
      icon="layers"
      title="还没有答题记录"
      description="做完第一题后，这里会按时间倒序留下痕迹。"
      action-text="现在开始"
      @action="toTrain"
    />
    <EmptyState
      v-else-if="rows.length === 0"
      icon="bookmark"
      title="收藏考前要复习的材料，这里集中回收"
      description="例文、听解题、读解篇目都能收藏，考前只看这一页。"
      action-text="去例文库挑几条"
      @action="toExamples"
    />

    <ul v-else class="list">
      <ReviewItem
        v-for="row in pager.pageItems.value"
        :key="row.key"
        :row="row"
        :editable="tab !== 'fav'"
      />
    </ul>

    <Pager
      :page="pager.page.value"
      :total-pages="pager.totalPages.value"
      unit="页"
      @first="pager.first"
      @prev="pager.prev"
      @next="pager.next"
      @last="pager.last"
    />

    <ModalConfirm
      :open="confirming"
      title="清空全部错题记录？"
      description="此操作会移除回收池中的全部错题，清空后 4 秒内可以撤销。"
      confirm-text="清空"
      @cancel="confirming = false"
      @confirm="doClear"
    />
  </div>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.tabs {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
}

.head__actions {
  display: flex;
  gap: var(--space-2);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

@media (max-width: 960px) {
  .head {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
