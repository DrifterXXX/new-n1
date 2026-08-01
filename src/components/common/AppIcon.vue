<script setup lang="ts">
/**
 * 图标唯一出口。业务组件禁止直接 import lucide-vue-next。
 * 非白名单名称 -> dev 告警 + 回退 circle 占位。图标按钮必须传 ariaLabel。
 */
import { computed } from 'vue';
import { ICONS, type IconName } from './icon-registry';

const props = withDefaults(
  defineProps<{
    name: IconName;
    size?: 16 | 20 | 24;
    ariaLabel?: string;
    spin?: boolean;
  }>(),
  { size: 20, ariaLabel: undefined, spin: false },
);

const resolved = computed(() => {
  const icon = ICONS[props.name];
  if (!icon) {
    if (import.meta.env.DEV) {
      console.warn(`[AppIcon] "${String(props.name)}" 不在锁定白名单内，已回退占位图标`);
    }
    return ICONS.circle;
  }
  return icon;
});
</script>

<template>
  <component
    :is="resolved"
    class="app-icon"
    :class="{ 'app-icon--spin': spin }"
    :size="size"
    :stroke-width="2"
    :aria-label="ariaLabel"
    :aria-hidden="ariaLabel ? undefined : 'true'"
    :role="ariaLabel ? 'img' : undefined"
    focusable="false"
  />
</template>

<style scoped>
.app-icon {
  color: currentColor;
  flex: none;
  display: block;
}

.app-icon--spin {
  animation: app-icon-spin 900ms linear infinite;
}

@keyframes app-icon-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
