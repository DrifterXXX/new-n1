<script setup lang="ts">
/** 选模式界面: 错题池空提示 + 三种训练模式 + 听解/读解专项入口。 */
import AppButton from '@/components/common/AppButton.vue';
import AppIcon from '@/components/common/AppIcon.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { useContentStore } from '@/stores/content';
import { useSessionStore, type SessionMode } from '@/stores/session';

const emit = defineEmits<{ begin: [mode: SessionMode] }>();

const content = useContentStore();
const session = useSessionStore();

const MODES: Array<{ mode: SessionMode; title: string; desc: string; icon: 'dumbbell' | 'target' | 'rotate-ccw' }> = [
  { mode: 'mixed', title: '混合训练', desc: '听解与读解按目标题数随机组卷', icon: 'dumbbell' },
  { mode: 'weak', title: '薄弱优先', desc: '正确率最低的题型排在最前面', icon: 'target' },
  { mode: 'wrong', title: '错题回练', desc: '只抽错题池，连对 3 次自动移出', icon: 'rotate-ccw' },
];

function begin(mode: SessionMode): void {
  emit('begin', mode);
}
</script>

<template>
  <div>
    <div v-if="session.emptyReason" class="card">
      <EmptyState
        icon="rotate-ccw"
        :title="session.emptyReason"
        description="先做一组混合训练，错题会自动进入回收池。"
        action-text="做一组混合训练"
        @action="begin('mixed')"
      />
    </div>
    <section class="modes">
      <button
        v-for="m in MODES"
        :key="m.mode"
        type="button"
        class="card mode"
        :disabled="!content.ready"
        @click="begin(m.mode)"
      >
        <AppIcon :name="m.icon" :size="24" />
        <span class="mode__title">{{ m.title }}</span>
        <span class="mode__desc">{{ m.desc }}</span>
      </button>
      <div class="card mode mode--split">
        <AppIcon name="layers" :size="24" />
        <span class="mode__title">专项题库</span>
        <span class="mode__desc">只练一个大题，节奏更稳</span>
        <div class="mode__actions">
          <AppButton size="sm" icon="headphones" :disabled="!content.ready" @click="begin('listening')">
            听解专项
          </AppButton>
          <AppButton size="sm" icon="file-text" :disabled="!content.ready" @click="begin('reading')">
            读解专项
          </AppButton>
        </div>
      </div>
    </section>
    <p v-if="!content.ready && !content.error" class="meta">题库加载中，稍等一下就能开始。</p>
    <p v-if="content.error" class="meta">{{ content.error }}</p>
  </div>
</template>

<style scoped>
.modes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.mode {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-5);
  text-align: left;
  color: var(--color-text-2);
  transition:
    border-color var(--motion-fast) var(--ease),
    background-color var(--motion-fast) var(--ease);
}

.mode:hover:not(:disabled) {
  border-color: var(--color-primary);
  background: var(--color-surface-2);
}

.mode:disabled {
  opacity: 0.6;
}

.mode__title {
  font-size: var(--text-xl);
  font-weight: var(--fw-emphasis);
  color: var(--color-text);
}

.mode__desc {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.mode__actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

@media (max-width: 960px) {
  .modes {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
