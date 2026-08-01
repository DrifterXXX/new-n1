<script setup lang="ts">
/** 应用根: 启动时水合用户数据 + 应用偏好 + 懒加载题库, 之后只渲染布局骨架。 */
import { onBeforeUnmount, onMounted } from 'vue';
import AppShell from '@/components/layout/AppShell.vue';
import { useContentStore } from '@/stores/content';
import { useSettingsStore } from '@/stores/settings';
import { useUserStore } from '@/stores/user';

const user = useUserStore();
const settings = useSettingsStore();
const content = useContentStore();

function flushBeforeUnload(): void {
  void user.flush();
}

onMounted(async () => {
  await user.init();
  settings.apply();
  void content.load();
  window.addEventListener('beforeunload', flushBeforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', flushBeforeUnload);
  user.dispose();
});
</script>

<template>
  <AppShell />
</template>
