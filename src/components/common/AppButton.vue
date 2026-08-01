<script setup lang="ts">
/** 基础按钮: 覆盖 default/hover/focus/active/disabled/loading 六态。 */
import AppIcon from './AppIcon.vue';
import type { IconName } from './icon-registry';

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md';
    icon?: IconName;
    iconRight?: IconName;
    block?: boolean;
    disabled?: boolean;
    loading?: boolean;
    ariaLabel?: string;
    active?: boolean;
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    icon: undefined,
    iconRight: undefined,
    block: false,
    disabled: false,
    loading: false,
    ariaLabel: undefined,
    active: false,
  },
);
</script>

<template>
  <button
    type="button"
    class="btn"
    :class="[`btn--${variant}`, `btn--${size}`, { 'btn--block': block, 'btn--active': active }]"
    :disabled="disabled || loading"
    :aria-label="ariaLabel"
    :aria-pressed="active ? 'true' : undefined"
  >
    <AppIcon v-if="loading" name="loader" :size="16" spin />
    <AppIcon v-else-if="icon" :name="icon" :size="16" />
    <span v-if="$slots.default" class="btn__label"><slot /></span>
    <AppIcon v-if="iconRight && !loading" :name="iconRight" :size="16" />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--tap-min);
  padding: 0 var(--space-4);
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  font-size: var(--text-base);
  font-weight: var(--fw-emphasis);
  white-space: nowrap;
  transition:
    background-color var(--motion-fast) var(--ease),
    border-color var(--motion-fast) var(--ease),
    color var(--motion-fast) var(--ease);
}

.btn--sm {
  min-height: 34px;
  padding: 0 var(--space-3);
  font-size: var(--text-sm);
}

.btn--block {
  width: 100%;
}

.btn--primary {
  background: var(--color-primary);
  color: var(--color-primary-on);
}
.btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}
.btn--primary:active:not(:disabled) {
  background: var(--color-primary-active);
}

.btn--secondary {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
}
.btn--secondary:hover:not(:disabled) {
  background: var(--color-surface-2);
  border-color: var(--color-border-strong);
}

.btn--ghost {
  background: transparent;
  color: var(--color-text-2);
}
.btn--ghost:hover:not(:disabled) {
  background: var(--color-surface-2);
  color: var(--color-text);
}

.btn--danger {
  background: transparent;
  border-color: var(--color-danger);
  color: var(--color-danger-strong);
}
.btn--danger:hover:not(:disabled) {
  background: var(--color-danger-soft);
}

.btn--active {
  background: var(--color-primary-soft);
  color: var(--color-primary);
  border-color: transparent;
}

.btn:disabled {
  opacity: 0.55;
}

.btn__label {
  line-height: 1;
}
</style>
