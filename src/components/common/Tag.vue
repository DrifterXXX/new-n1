<script setup lang="ts">
/** 元数据 Tag(只读标记, 非交互)。 */
import AppIcon from './AppIcon.vue';
import type { IconName } from './icon-registry';

withDefaults(
  defineProps<{ label: string; icon?: IconName; tone?: 'neutral' | 'primary' | 'warn' }>(),
  { icon: undefined, tone: 'neutral' },
);
</script>

<template>
  <span class="tag" :class="`tag--${tone}`">
    <AppIcon v-if="icon" :name="icon" :size="16" />
    {{ label }}
  </span>
</template>

<style scoped>
.tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-text-meta);
  font-size: var(--text-xs);
  line-height: 1.7;
  white-space: nowrap;
}

.tag--primary {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.tag--warn {
  background: var(--color-warn-soft);
  color: var(--color-warn);
}
</style>
