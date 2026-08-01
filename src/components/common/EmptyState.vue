<script setup lang="ts">
/** 空态(每页文案不同, 禁止空洞占位)。图标 24, 主文案 + 可选引导 CTA。 */
import AppButton from './AppButton.vue';
import AppIcon from './AppIcon.vue';
import type { IconName } from './icon-registry';

withDefaults(
  defineProps<{
    icon?: IconName;
    title: string;
    description?: string;
    actionText?: string;
    actionIcon?: IconName;
  }>(),
  { icon: 'info', description: undefined, actionText: undefined, actionIcon: 'arrow-right' },
);

defineEmits<{ (e: 'action'): void }>();
</script>

<template>
  <div class="empty">
    <AppIcon class="empty__icon" :name="icon" :size="24" />
    <p class="empty__title">{{ title }}</p>
    <p v-if="description" class="empty__desc">{{ description }}</p>
    <AppButton
      v-if="actionText"
      class="empty__cta"
      variant="primary"
      :icon-right="actionIcon"
      @click="$emit('action')"
    >
      {{ actionText }}
    </AppButton>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-10) var(--space-6);
  text-align: center;
}

.empty__icon {
  color: var(--color-text-meta);
}

.empty__title {
  font-size: var(--text-base);
  font-weight: var(--fw-emphasis);
  color: var(--color-text);
}

.empty__desc {
  max-width: 42ch;
  font-size: var(--text-sm);
  line-height: var(--leading-body);
  color: var(--color-text-muted);
}

.empty__cta {
  margin-top: var(--space-2);
}
</style>
