<script setup lang="ts">
/** 布局骨架: 侧栏 + 顶栏 + 路由内容 + 移动 TabBar / MiniDock / Toast / 设置抽屉。仅布局, 无业务。 */
import { ref } from 'vue';
import ToastHost from '@/components/common/ToastHost.vue';
import { useUserStore } from '@/stores/user';
import AppSidebar from './AppSidebar.vue';
import AppTopbar from './AppTopbar.vue';
import AudioMiniDock from './AudioMiniDock.vue';
import MobileTabBar from './MobileTabBar.vue';
import SettingsDrawer from './SettingsDrawer.vue';

const user = useUserStore();
const drawerOpen = ref(false);
</script>

<template>
  <div class="shell">
    <AppSidebar class="shell__side" />
    <div class="shell__main">
      <AppTopbar @open-settings="drawerOpen = true" />
      <p v-if="user.storageError" class="shell__alert" role="alert">{{ user.storageError }}</p>
      <main class="shell__content">
        <RouterView v-slot="{ Component }">
          <component :is="Component" />
        </RouterView>
      </main>
    </div>

    <MobileTabBar class="shell__tabbar" @open-settings="drawerOpen = true" />
    <AudioMiniDock />
    <SettingsDrawer :open="drawerOpen" @close="drawerOpen = false" />
    <ToastHost />
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  min-height: 100%;
  background: var(--color-bg);
}

.shell__main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.shell__content {
  width: 100%;
  max-width: var(--container-max);
  margin: 0 auto;
  padding: var(--space-6);
}

.shell__alert {
  margin: var(--space-4) var(--space-6) 0;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-sm);
  background: var(--color-danger-soft);
  color: var(--color-danger-strong);
  font-size: var(--text-sm);
}

.shell__tabbar {
  display: none;
}

@media (max-width: 1200px) {
  .shell {
    grid-template-columns: var(--sidebar-rail-w) minmax(0, 1fr);
  }
}

@media (max-width: 960px) {
  .shell {
    grid-template-columns: minmax(0, 1fr);
  }
  .shell__side {
    display: none;
  }
  .shell__tabbar {
    display: grid;
  }
  .shell__content {
    padding: var(--space-4) var(--space-4) calc(76px + env(safe-area-inset-bottom));
  }
  .shell__alert {
    margin: var(--space-3) var(--space-4) 0;
  }
}
</style>
