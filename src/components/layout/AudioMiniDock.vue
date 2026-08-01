<script setup lang="ts">
/** 移动端播放态底部 dock(位于 TabBar 之上): 当前条目 + 播放控制 + 进度。 */
import { computed } from 'vue';
import AppIcon from '@/components/common/AppIcon.vue';
import AudioBtn from '@/components/common/AudioBtn.vue';
import { useAudioStore } from '@/stores/audio';

const audio = useAudioStore();

const visible = computed(() => audio.status === 'playing' || audio.status === 'loading');
const percent = computed(() => Math.round(audio.progress * 100));

function toggle(): void {
  if (audio.status === 'playing') audio.pause();
}
</script>

<template>
  <div v-if="visible" class="dock" role="region" aria-label="正在播放">
    <AudioBtn
      variant="ghost"
      :status="audio.status"
      :label="audio.status === 'playing' ? '暂停播放' : '加载中'"
      @click="toggle"
    />
    <div class="dock__body">
      <p class="dock__label jp">{{ audio.label || '正在播放' }}</p>
      <div class="dock__bar" role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100">
        <span class="dock__fill" :style="{ width: percent + '%' }" />
      </div>
    </div>
    <button type="button" class="dock__stop" aria-label="停止播放" @click="audio.stop()">
      <AppIcon name="x" :size="16" />
    </button>
  </div>
</template>

<style scoped>
.dock {
  position: fixed;
  left: var(--space-3);
  right: var(--space-3);
  bottom: calc(56px + env(safe-area-inset-bottom) + var(--space-2));
  z-index: 45;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--elev-overlay);
}

.dock__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.dock__label {
  font-size: var(--text-sm);
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dock__bar {
  height: 3px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-2);
  overflow: hidden;
}

.dock__fill {
  display: block;
  height: 100%;
  background: var(--color-primary);
  transition: width var(--motion-base) var(--ease);
}

.dock__stop {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  color: var(--color-text-meta);
}

@media (min-width: 961px) {
  .dock {
    display: none;
  }
}
</style>
