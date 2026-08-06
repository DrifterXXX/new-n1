<script setup lang="ts">
/**
 * 音频触发钮(PAGE-SPECS §0.5 四态)。
 * idle 描边 / playing 实心 primary / loading spinner / error→TTS 时带 info 角标。
 * 本组件不持有播放逻辑, 状态由调用方从 audio store 传入。
 */
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';
import type { AudioStatus } from '@/stores/audio';

const props = withDefaults(
  defineProps<{
    /** 无障碍名称, 图标钮必填。 */
    label: string;
    status?: AudioStatus;
    variant?: 'solid' | 'ghost';
    /** 可选可见文案(例如「再生」)。 */
    text?: string;
    /** 正在用浏览器朗读(真人音频缺失), 显示 info 角标。 */
    usingTts?: boolean;
  }>(),
  { status: 'idle', variant: 'solid', text: undefined, usingTts: false },
);

defineEmits<{ (e: 'click', ev?: MouseEvent): void }>();

const icon = computed(() => {
  if (props.status === 'loading') return 'loader' as const;
  if (props.status === 'playing') return 'pause' as const;
  return 'play' as const;
});
</script>

<template>
  <button
    type="button"
    class="audio-btn"
    :class="[`audio-btn--${variant}`, `is-${status}`, { 'has-text': Boolean(text) }]"
    :aria-label="label"
    :aria-pressed="status === 'playing' ? 'true' : 'false'"
    @click.stop="$emit('click', $event)"
  >
    <AppIcon :name="icon" :size="16" :spin="status === 'loading'" />
    <span v-if="text" class="audio-btn__text">{{ text }}</span>
    <AppIcon v-if="usingTts" class="audio-btn__badge" name="info" :size="16" />
  </button>
</template>

<style scoped>
.audio-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: var(--tap-min);
  min-height: var(--tap-min);
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-2);
  transition:
    background-color var(--motion-fast) var(--ease),
    border-color var(--motion-fast) var(--ease),
    color var(--motion-fast) var(--ease);
}

.audio-btn:not(.has-text) {
  padding: 0;
}

.audio-btn:hover {
  border-color: var(--color-border-strong);
  background: var(--color-surface-2);
  color: var(--color-text);
}

.audio-btn--ghost {
  border-color: transparent;
  background: transparent;
}

.audio-btn.is-playing {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-primary-on);
}

.audio-btn.is-loading {
  color: var(--color-primary);
}

.audio-btn.is-error {
  border-color: var(--color-warn);
  color: var(--color-warn);
}

.audio-btn__text {
  font-size: var(--text-sm);
  font-weight: var(--fw-emphasis);
}

.audio-btn__badge {
  position: absolute;
  right: -2px;
  top: -2px;
  color: var(--color-warn);
}
</style>
