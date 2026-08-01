<script setup lang="ts">
/** 过滤 Chip: active 用 primary-soft 底 + primary 字。 */
defineProps<{ label: string; active?: boolean; count?: number }>();
defineEmits<{ (e: 'click'): void }>();
</script>

<template>
  <button
    type="button"
    class="chip"
    :class="{ 'chip--active': active }"
    :aria-pressed="active ? 'true' : 'false'"
    @click="$emit('click')"
  >
    <span>{{ label }}</span>
    <span v-if="count !== undefined" class="chip__count mono">{{ count }}</span>
  </button>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 36px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-2);
  font-size: var(--text-sm);
  white-space: nowrap;
  transition:
    background-color var(--motion-fast) var(--ease),
    border-color var(--motion-fast) var(--ease),
    color var(--motion-fast) var(--ease);
}

.chip:hover {
  background: var(--color-surface-2);
  border-color: var(--color-border-strong);
  color: var(--color-text);
}

.chip--active {
  background: var(--color-primary-soft);
  border-color: transparent;
  color: var(--color-primary);
  font-weight: var(--fw-emphasis);
}

.chip__count {
  font-size: var(--text-xs);
  color: var(--color-text-meta);
}

.chip--active .chip__count {
  color: var(--color-primary);
}
</style>
