<script setup lang="ts">
/** 顶栏(sticky): 左标题/副标题, 右全局控件。「今日 N 题」是每屏唯一强调 CTA。 */
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppButton from '@/components/common/AppButton.vue';
import AppIcon from '@/components/common/AppIcon.vue';
import { ROUTE_NAMES } from '@/constants';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';

const emit = defineEmits<{ (e: 'open-settings'): void }>();

const route = useRoute();
const router = useRouter();
const settings = useSettingsStore();
const session = useSessionStore();

const title = computed(() => route.meta.title ?? 'N1 备考中心');
const subtitle = computed(() => route.meta.subtitle ?? '');
const dailyLabel = computed(() => `今日 ${settings.dailyTarget} 题`);

function onVolume(e: Event): void {
  const target = e.target as HTMLInputElement;
  settings.setVolume(Number(target.value) / 100);
}

async function startDaily(): Promise<void> {
  session.start('mixed');
  await router.push({ name: ROUTE_NAMES.train });
}

async function resume(): Promise<void> {
  await router.push({ name: ROUTE_NAMES.train });
}
</script>

<template>
  <header class="topbar">
    <div class="topbar__head">
      <h1 class="topbar__title">{{ title }}</h1>
      <p v-if="subtitle" class="topbar__sub">{{ subtitle }}</p>
    </div>

    <div class="topbar__tools">
      <div class="topbar__volume">
        <button
          type="button"
          class="topbar__icon-btn"
          :aria-label="settings.muted ? '取消静音' : '静音'"
          @click="settings.toggleMute()"
        >
          <AppIcon :name="settings.muted ? 'volume-x' : 'volume-2'" :size="20" />
        </button>
        <input
          class="topbar__range"
          type="range"
          min="0"
          max="100"
          step="5"
          :value="Math.round(settings.volume * 100)"
          aria-label="音量"
          @input="onVolume"
        />
      </div>

      <AppButton
        v-if="session.active"
        class="topbar__resume"
        variant="secondary"
        icon="dumbbell"
        @click="resume"
      >
        继续训练
      </AppButton>

      <AppButton variant="primary" icon-right="arrow-right" @click="startDaily">
        {{ dailyLabel }}
      </AppButton>

      <button
        type="button"
        class="topbar__icon-btn"
        :aria-label="settings.theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'"
        @click="settings.toggleTheme()"
      >
        <AppIcon :name="settings.theme === 'dark' ? 'sun' : 'moon'" :size="20" />
      </button>

      <button
        type="button"
        class="topbar__icon-btn"
        aria-label="打开设置"
        @click="emit('open-settings')"
      >
        <AppIcon name="settings-2" :size="20" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg);
  backdrop-filter: blur(10px);
}

.topbar__title {
  font-size: var(--text-xl);
  font-weight: var(--fw-announce);
  letter-spacing: var(--tracking-tight);
  color: var(--color-text);
}

.topbar__sub {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.topbar__tools {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.topbar__volume {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.topbar__range {
  width: 88px;
  accent-color: var(--color-primary);
}

.topbar__icon-btn {
  display: grid;
  place-items: center;
  min-width: var(--tap-min);
  min-height: var(--tap-min);
  border-radius: var(--radius-sm);
  color: var(--color-text-2);
  transition:
    background-color var(--motion-fast) var(--ease),
    color var(--motion-fast) var(--ease);
}

.topbar__icon-btn:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}

@media (max-width: 960px) {
  .topbar {
    padding: var(--space-3) var(--space-4);
  }
  .topbar__sub,
  .topbar__range,
  .topbar__resume {
    display: none;
  }
  .topbar__title {
    font-size: var(--text-base);
  }
}
</style>
