<script setup lang="ts">
/**
 * 单个选项。答题反馈三重编码 = 图标 + 文本 + 颜色(色盲可达)。
 * state: idle(未答) / correct(正解) / wrong(误选) / muted(答后其余项)
 */
import AppIcon from './AppIcon.vue';

defineProps<{
  index: number;
  text: string;
  state: 'idle' | 'correct' | 'wrong' | 'muted';
  disabled?: boolean;
}>();

defineEmits<{ (e: 'select'): void }>();
</script>

<template>
  <div class="option" :class="`option--${state}`">
    <button
      type="button"
      class="option__main"
      :disabled="disabled"
      @click="$emit('select')"
    >
      <span class="option__index mono">{{ index + 1 }}</span>
      <span class="option__text jp">{{ text }}</span>
      <span v-if="state === 'correct'" class="option__flag">
        <AppIcon name="check" :size="16" />
        <span>正解</span>
      </span>
      <span v-else-if="state === 'wrong'" class="option__flag">
        <AppIcon name="x" :size="16" />
        <span>你选的</span>
      </span>
    </button>
    <slot name="trailing" />
  </div>
</template>

<style scoped>
.option {
  display: flex;
  align-items: stretch;
  gap: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  padding-right: var(--space-2);
  transition:
    background-color var(--motion-fast) var(--ease),
    border-color var(--motion-fast) var(--ease);
}

.option__main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--tap-min);
  padding: var(--space-2) var(--space-3);
  text-align: left;
  color: var(--color-text);
}

.option__index {
  flex: none;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.option__text {
  flex: 1;
  font-size: var(--text-base);
}

.option__flag {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  font-weight: var(--fw-emphasis);
}

.option:hover:has(.option__main:not(:disabled)) {
  border-color: var(--color-border-strong);
  background: var(--color-surface-2);
}

.option--correct {
  border-color: var(--color-success);
  background: var(--color-success-soft);
}
.option--correct .option__main,
.option--correct .option__flag {
  color: var(--color-success-strong);
}
.option--correct .option__index {
  background: var(--color-success);
  color: var(--color-surface);
}

.option--wrong {
  border-color: var(--color-danger);
  background: var(--color-danger-soft);
}
.option--wrong .option__main,
.option--wrong .option__flag {
  color: var(--color-danger-strong);
}
.option--wrong .option__index {
  background: var(--color-danger);
  color: var(--color-surface);
}

.option--muted {
  opacity: 0.62;
}
</style>
