<script setup lang="ts">
/** 分页: 首/上/页码/下/末。禁用态降透明并转 meta 色。 */
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';

const props = defineProps<{ page: number; totalPages: number; unit?: string }>();

const emit = defineEmits<{
  (e: 'first'): void;
  (e: 'prev'): void;
  (e: 'next'): void;
  (e: 'last'): void;
}>();

const atStart = computed(() => props.page <= 1);
const atEnd = computed(() => props.page >= props.totalPages);
</script>

<template>
  <nav v-if="totalPages > 1" class="pager" aria-label="分页导航">
    <button type="button" class="pager__btn" :disabled="atStart" aria-label="第一页" @click="emit('first')">
      <AppIcon name="chevrons-left" :size="16" />
    </button>
    <button type="button" class="pager__btn" :disabled="atStart" aria-label="上一页" @click="emit('prev')">
      <AppIcon name="chevron-left" :size="16" />
    </button>
    <span class="pager__status mono" aria-live="polite">
      {{ page }} / {{ totalPages }}
      <span v-if="unit" class="pager__unit">{{ unit }}</span>
    </span>
    <button type="button" class="pager__btn" :disabled="atEnd" aria-label="下一页" @click="emit('next')">
      <AppIcon name="chevron-right" :size="16" />
    </button>
    <button type="button" class="pager__btn" :disabled="atEnd" aria-label="最后一页" @click="emit('last')">
      <AppIcon name="chevrons-right" :size="16" />
    </button>
  </nav>
</template>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4) 0;
}

.pager__btn {
  display: grid;
  place-items: center;
  min-width: var(--tap-min);
  min-height: var(--tap-min);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-2);
  transition:
    background-color var(--motion-fast) var(--ease),
    border-color var(--motion-fast) var(--ease),
    color var(--motion-fast) var(--ease);
}

.pager__btn:hover:not(:disabled) {
  background: var(--color-surface-2);
  border-color: var(--color-border-strong);
  color: var(--color-text);
}

.pager__btn:disabled {
  opacity: 0.45;
  color: var(--color-text-meta);
}

.pager__status {
  min-width: 96px;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.pager__unit {
  margin-left: var(--space-1);
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  color: var(--color-text-meta);
}
</style>
