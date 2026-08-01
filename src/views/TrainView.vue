<script setup lang="ts">
/** 题型训练编排: 选模式 → 单题流(键盘流) → 小结。三态由 session 驱动。 */
import { useRouter } from 'vue-router';
import TrainFlow from '@/components/question/TrainFlow.vue';
import TrainModeCards from '@/components/question/TrainModeCards.vue';
import AppButton from '@/components/common/AppButton.vue';
import { ROUTE_NAMES } from '@/constants';
import { useSessionStore, type SessionMode } from '@/stores/session';

const router = useRouter();
const session = useSessionStore();

function begin(mode: SessionMode): void {
  session.start(mode);
}

async function toReview(): Promise<void> {
  await router.push({ name: ROUTE_NAMES.review });
}
</script>

<template>
  <div class="view">
    <TrainModeCards v-if="!session.active" @begin="begin" />

    <section v-else-if="session.finished" class="card summary">
      <h2 class="section-title">这组做完了</h2>
      <div class="summary__grid">
        <p><span class="mono summary__num">{{ session.summary.correct }}</span><span class="meta">答对</span></p>
        <p><span class="mono summary__num">{{ session.summary.wrong }}</span><span class="meta">答错</span></p>
        <p><span class="mono summary__num">{{ session.summary.rate }}%</span><span class="meta">正确率</span></p>
      </div>
      <div class="summary__actions">
        <AppButton variant="primary" icon="dumbbell" @click="begin('mixed')">再来一组</AppButton>
        <AppButton icon="rotate-ccw" @click="toReview">去错题本回收</AppButton>
        <AppButton variant="ghost" @click="session.quit()">退出训练</AppButton>
      </div>
    </section>

    <TrainFlow v-else />
  </div>
</template>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-6);
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
