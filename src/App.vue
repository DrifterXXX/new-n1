<script setup lang="ts">
/** 应用根: 启动时水合用户数据 + 应用偏好 + 懒加载题库, 之后只渲染布局骨架 + 错误边界。 */
import { onBeforeUnmount, onErrorCaptured, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import EmptyState from '@/components/common/EmptyState.vue';
import AppShell from '@/components/layout/AppShell.vue';
import { useContentStore } from '@/stores/content';
import { useSettingsStore } from '@/stores/settings';
import { useUserStore } from '@/stores/user';

const user = useUserStore();
const settings = useSettingsStore();
const content = useContentStore();
const router = useRouter();

/** 非空 = 已进入错误态; 内容是给自己排查用的原始信息, 用户看到的是上面的中文说明。 */
const fatal = ref('');

function describe(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  return String(err);
}

/**
 * 组件树错误边界: 任一子组件渲染/生命周期抛错都在这里兜住, 换成可恢复的错误态,
 * 不让整页白屏。return false 阻止继续冒泡(main.ts 的 errorHandler 只兜边界外的错误)。
 */
onErrorCaptured((err) => {
  console.error('[app-error]', err);
  fatal.value = describe(err);
  return false;
});

/** 懒加载视图的 chunk 拉取失败走的是 router 错误通道, 不经过 onErrorCaptured, 要单独接。 */
router.onError((err) => {
  console.error('[route-error]', err);
  fatal.value = describe(err);
});

function reload(): void {
  window.location.reload();
}

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
  <main v-if="fatal" class="fatal">
    <EmptyState
      icon="circle-x"
      title="这个页面没能加载出来"
      description="学习记录还在本地，一条都没丢。刷新一下通常就好了；如果反复失败，换个网络或清一次浏览器缓存再试。"
      action-text="刷新重试"
      action-icon="refresh-cw"
      @action="reload"
    >
      <p class="fatal__detail">{{ fatal }}</p>
    </EmptyState>
  </main>
  <AppShell v-else />
</template>

<style scoped>
.fatal {
  display: grid;
  place-items: center;
  min-height: 100dvh;
  padding: var(--gutter-phone);
  background: var(--color-bg);
}

.fatal__detail {
  max-width: 48ch;
  margin-top: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: var(--leading-body);
  color: var(--color-text-meta);
  overflow-wrap: anywhere;
}
</style>
