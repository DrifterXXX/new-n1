<script setup lang="ts">
/** 加载骨架。微光扫过; prefers-reduced-motion 时静态。 */
withDefaults(
  defineProps<{
    height?: string;
    width?: string;
    /** 连续渲染多行(带递减宽度), 用于文本段落骨架。 */
    lines?: number;
  }>(),
  { height: '16px', width: '100%', lines: 1 },
);
</script>

<template>
  <div class="skeleton-group" aria-hidden="true">
    <span
      v-for="i in lines"
      :key="i"
      class="skeleton"
      :style="{ height, width: i === lines && lines > 1 ? '62%' : width }"
    />
  </div>
</template>

<style scoped>
.skeleton-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
}

.skeleton {
  display: block;
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    var(--color-border-soft) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: skeleton-sweep 1400ms linear infinite;
}

@keyframes skeleton-sweep {
  from {
    background-position: 180% 0;
  }
  to {
    background-position: -80% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
    background-image: none;
  }
}
</style>
