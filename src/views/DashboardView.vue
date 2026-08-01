<script setup lang="ts">
/** 学习台: 打开即见「今天要做什么」。指标 / 今日任务 / 下一步 / 分型正确率。 */
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import DashboardMetrics from '@/components/question/DashboardMetrics.vue';
import AppButton from '@/components/common/AppButton.vue';
import AppIcon from '@/components/common/AppIcon.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { ROUTE_NAMES } from '@/constants';
import { useContentStore } from '@/stores/content';
import { DAILY_TASKS, useDailyStore } from '@/stores/daily';
import { useProgressStore } from '@/stores/progress';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';

const router = useRouter();
const content = useContentStore();
const daily = useDailyStore();
const progress = useProgressStore();
const session = useSessionStore();
const settings = useSettingsStore();

const listeningStat = computed(() => progress.kindAccuracy('listening'));
const readingStat = computed(() => progress.kindAccuracy('reading'));
const fresh = computed(() => progress.total === 0 && daily.doneCount === 0);

async function startDaily(): Promise<void> {
  session.start('mixed');
  await router.push({ name: ROUTE_NAMES.train });
}
async function startWeak(): Promise<void> {
  session.start('weak');
  await router.push({ name: ROUTE_NAMES.train });
}
async function go(name: string): Promise<void> {
  await router.push({ name });
}
</script>

<template>
  <div class="view">
    <DashboardMetrics />

    <p v-if="content.error" class="error-line" role="alert">
      {{ content.error }}
      <AppButton size="sm" icon="refresh-cw" @click="content.load()">重试</AppButton>
    </p>

    <section class="grid-2">
      <div class="card panel">
        <h2 class="section-title">今日任务</h2>
        <p class="meta">勾掉四件小事，比盯着总量更容易开始。</p>
        <ul class="tasks">
          <li v-for="task in DAILY_TASKS" :key="task.id">
            <button
              type="button"
              class="task"
              :class="{ 'is-done': daily.isTaskDone(task.id) }"
              :aria-pressed="daily.isTaskDone(task.id) ? 'true' : 'false'"
              @click="daily.toggleTask(task.id)"
            >
              <AppIcon :name="daily.isTaskDone(task.id) ? 'circle-check' : 'circle'" :size="20" />
              <span>{{ task.label }}</span>
            </button>
          </li>
        </ul>
        <p class="meta">连续学习 <span class="mono">{{ daily.streakDays }}</span> 天</p>
      </div>

      <div class="card panel">
        <h2 class="section-title">下一步</h2>
        <EmptyState
          v-if="fresh"
          icon="dumbbell"
          title="从今日 20 题开始你的备考"
          description="混合听解与读解，做完就能看到自己的薄弱题型。"
          action-text="今日 20 题"
          @action="startDaily"
        />
        <div v-else class="next">
          <AppButton variant="primary" icon-right="arrow-right" block @click="startDaily">
            今日 {{ settings.dailyTarget }} 题
          </AppButton>
          <AppButton icon="target" block @click="startWeak">只练薄弱</AppButton>
          <AppButton icon="rotate-ccw" block @click="go(ROUTE_NAMES.review)">
            进错题本（{{ progress.wrongCount }}）
          </AppButton>
          <AppButton icon="flag" block @click="go(ROUTE_NAMES.strategy)">看考试策略</AppButton>
        </div>
      </div>
    </section>

    <section class="grid-3">
      <div class="card panel">
        <h3 class="panel__title"><AppIcon name="headphones" :size="16" />听解正确率</h3>
        <p class="panel__big mono">
          {{ listeningStat.total === 0 ? '未练' : listeningStat.rate + '%' }}
        </p>
        <ul class="stat-rows">
          <li v-for="row in progress.statsByType('listening')" :key="row.type" class="stat-row">
            <span>{{ row.type }}</span>
            <span class="mono">{{ row.rate }}% · {{ row.total }} 题</span>
          </li>
          <li v-if="progress.statsByType('listening').length === 0" class="stat-row meta">
            还没有听解记录
          </li>
        </ul>
      </div>

      <div class="card panel">
        <h3 class="panel__title"><AppIcon name="file-text" :size="16" />读解正确率</h3>
        <p class="panel__big mono">
          {{ readingStat.total === 0 ? '未练' : readingStat.rate + '%' }}
        </p>
        <ul class="stat-rows">
          <li v-for="row in progress.statsByType('reading')" :key="row.type" class="stat-row">
            <span>{{ row.type }}</span>
            <span class="mono">{{ row.rate }}% · {{ row.total }} 题</span>
          </li>
          <li v-if="progress.statsByType('reading').length === 0" class="stat-row meta">
            还没有读解记录
          </li>
        </ul>
      </div>

      <div class="card panel">
        <h3 class="panel__title"><AppIcon name="layers" :size="16" />内容规模</h3>
        <ul class="stat-rows">
          <li class="stat-row"><span>例文</span><span class="mono">{{ content.examples.length }} 条</span></li>
          <li class="stat-row"><span>听解</span><span class="mono">{{ content.listening.length }} 题</span></li>
          <li class="stat-row"><span>读解</span><span class="mono">{{ content.readings.length }} 篇</span></li>
          <li class="stat-row">
            <span>读解设问</span><span class="mono">{{ content.readingQuestionCount }} 问</span>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

<style scoped>
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5);
}

.panel__title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-base);
  font-weight: var(--fw-emphasis);
  color: var(--color-text);
}

.panel__big {
  font-size: var(--text-2xl);
  color: var(--color-text);
}

.tasks {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.task {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: var(--tap-min);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-text-2);
  text-align: left;
  font-size: var(--text-base);
  transition: background-color var(--motion-fast) var(--ease);
}

.task:hover {
  background: var(--color-surface-2);
}

.task.is-done {
  color: var(--color-success-strong);
}

.next {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.stat-rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-2);
}

.error-line {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  font-size: var(--text-sm);
  color: var(--color-danger-strong);
}

@media (max-width: 1200px) {
  .grid-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .grid-2,
  .grid-3 {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
