<script setup lang="ts">
/** 移动底部导航(<960): 4 个路由 + 「更多」打开设置抽屉。 */
import AppIcon from '@/components/common/AppIcon.vue';
import { TAB_ITEMS } from './nav';

defineEmits<{ (e: 'open-settings'): void }>();
</script>

<template>
  <nav class="tabbar" aria-label="底部导航">
    <RouterLink
      v-for="item in TAB_ITEMS"
      :key="item.name"
      class="tabbar__item"
      active-class="is-active"
      :to="{ name: item.name }"
    >
      <AppIcon :name="item.icon" :size="24" />
      <span class="tabbar__label">{{ item.label }}</span>
    </RouterLink>
    <button type="button" class="tabbar__item" aria-label="更多与设置" @click="$emit('open-settings')">
      <AppIcon name="ellipsis" :size="24" />
      <span class="tabbar__label">更多</span>
    </button>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  height: calc(56px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

.tabbar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: var(--tap-min);
  color: var(--color-text-muted);
  transition: color var(--motion-fast) var(--ease);
}

.tabbar__item.is-active {
  color: var(--color-primary);
}

.tabbar__label {
  font-size: var(--text-xs);
}
</style>
