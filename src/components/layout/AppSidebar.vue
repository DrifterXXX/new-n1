<script setup lang="ts">
/** 桌面左侧导航(≥960)。960–1200 收窄为 rail(仅图标 + title tooltip)。 */
import AppIcon from '@/components/common/AppIcon.vue';
import { NAV_GROUPS } from './nav';
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__brand">
      <AppIcon name="target" :size="20" />
      <span class="sidebar__brand-text">N1 备考中心</span>
    </div>

    <nav class="sidebar__nav" aria-label="主导航">
      <div v-for="group in NAV_GROUPS" :key="group.caption" class="sidebar__group">
        <p class="caps sidebar__caption">{{ group.caption }}</p>
        <RouterLink
          v-for="item in group.items"
          :key="item.name"
          class="sidebar__item"
          active-class="is-active"
          :to="{ name: item.name }"
          :title="item.label"
        >
          <AppIcon :name="item.icon" :size="20" />
          <span class="sidebar__label">{{ item.label }}</span>
        </RouterLink>
      </div>
    </nav>

    <p class="sidebar__foot meta">数据只存在这台设备，记得定期导出备份。</p>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  height: 100vh;
  position: sticky;
  top: 0;
  padding: var(--space-5) var(--space-3);
  border-right: 1px solid var(--color-border);
  background: var(--color-surface);
  overflow-y: auto;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-2);
  color: var(--color-primary);
}

.sidebar__brand-text {
  font-size: var(--text-base);
  font-weight: var(--fw-announce);
  letter-spacing: var(--tracking-tight);
  color: var(--color-text);
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.sidebar__group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar__caption {
  padding: 0 var(--space-2) var(--space-1);
}

.sidebar__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 40px;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-text-2);
  font-size: var(--text-base);
  transition:
    background-color var(--motion-fast) var(--ease),
    color var(--motion-fast) var(--ease);
}

.sidebar__item:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}

.sidebar__item.is-active {
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: var(--fw-emphasis);
}

.sidebar__foot {
  margin-top: auto;
  padding: var(--space-3) var(--space-2) 0;
  border-top: 1px solid var(--color-border);
  font-size: var(--text-xs);
}

@media (max-width: 1200px) {
  .sidebar__label,
  .sidebar__caption,
  .sidebar__brand-text,
  .sidebar__foot {
    display: none;
  }
  .sidebar {
    align-items: center;
    padding: var(--space-5) var(--space-2);
  }
  .sidebar__item {
    justify-content: center;
    padding: var(--space-2);
  }
}
</style>
