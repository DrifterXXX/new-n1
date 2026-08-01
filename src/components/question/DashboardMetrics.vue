<script setup lang="ts">
/** 学习台顶部指标卡: 今日完成 / 累计答题 / 总正确率 / 待回收错题。 */
import { computed } from 'vue';
import AppIcon from '@/components/common/AppIcon.vue';
import SkeletonBlock from '@/components/common/SkeletonBlock.vue';
import type { IconName } from '@/components/common/icon-registry';
import { useContentStore } from '@/stores/content';
import { useDailyStore } from '@/stores/daily';
import { useProgressStore } from '@/stores/progress';
import { useSettingsStore } from '@/stores/settings';

interface Metric {
  key: string;
  icon: IconName;
  label: string;
  value: string;
  hint: string;
  ratio: number;
  tone: 'primary' | 'danger';
}

const content = useContentStore();
const daily = useDailyStore();
const progress = useProgressStore();
const settings = useSettingsStore();

const metrics = computed<Metric[]>(() => [
  {
    key: 'today',
    icon: 'check-circle',
    label: '今日完成',
    value: `${daily.doneCount}/${settings.dailyTarget}`,
    hint: daily.remaining > 0 ? `还差 ${daily.remaining} 题达标` : '今天的目标已完成',
    ratio: daily.progress,
    tone: 'primary',
  },
  {
    key: 'total',
    icon: 'layers',
    label: '累计答题',
    value: String(progress.total),
    hint: `已掌握 ${progress.masteredCount} 题（连对 3 次）`,
    ratio: Math.min(1, progress.total / 500),
    tone: 'primary',
  },
  {
    key: 'rate',
    icon: 'percent',
    label: '总正确率',
    value: `${progress.accuracy}%`,
    hint: progress.total === 0 ? '做完第一组就有数据' : `答对 ${progress.correctCount} 题`,
    ratio: progress.accuracy / 100,
    tone: 'primary',
  },
  {
    key: 'wrong',
    icon: 'rotate-ccw',
    label: '待回收错题',
    value: String(progress.wrongCount),
    hint: progress.wrongCount === 0 ? '错题池是空的' : '连对 3 次即从池中移出',
    ratio:
      progress.total === 0
        ? 0
        : Math.min(1, progress.wrongCount / Math.max(1, progress.total)),
    tone: 'danger',
  },
]);

const fresh = computed(() => progress.total === 0 && daily.doneCount === 0);
</script>

<template>
  <section class="metrics">
    <template v-if="content.loading && fresh">
      <div v-for="i in 4" :key="i" class="card metric">
        <SkeletonBlock height="14px" width="48%" />
        <SkeletonBlock height="28px" width="64%" />
        <SkeletonBlock height="4px" />
      </div>
    </template>
    <article v-for="m in metrics" v-else :key="m.key" class="card metric">
      <p class="metric__label"><AppIcon :name="m.icon" :size="16" />{{ m.label }}</p>
      <p class="metric__value mono">{{ m.value }}</p>
      <div class="metric__bar">
        <span
          class="metric__fill"
          :class="`metric__fill--${m.tone}`"
          :style="{ width: Math.round(m.ratio * 100) + '%' }"
        />
      </div>
      <p class="metric__hint">{{ m.hint }}</p>
    </article>
  </section>
</template>

<style scoped>
.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
}

.metric {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
}

.metric__label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.metric__value {
  font-size: var(--text-3xl);
  line-height: var(--leading-tight);
  color: var(--color-text);
}

.metric__bar {
  height: 4px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-2);
  overflow: hidden;
}

.metric__fill {
  display: block;
  height: 100%;
}

.metric__fill--primary {
  background: var(--color-primary);
}
.metric__fill--danger {
  background: var(--color-danger);
}

.metric__hint {
  font-size: var(--text-xs);
  color: var(--color-text-meta);
}

@media (max-width: 1200px) {
  .metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .metrics {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
