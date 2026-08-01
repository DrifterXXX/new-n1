<script setup lang="ts">
/**
 * 播放态 dock: 当前条目 + 播放控制 + 可拖动进度条(AC-06 听解逐句定位)。
 * 移动端浮在 TabBar 之上, 桌面端浮在右下角 —— 两端都必须可定位, 故不再对桌面隐藏。
 */
import { computed, ref } from 'vue';
import AppIcon from '@/components/common/AppIcon.vue';
import AudioBtn from '@/components/common/AudioBtn.vue';
import { useAudioStore } from '@/stores/audio';

const audio = useAudioStore();

/** 拖动中以本地值渲染, 避免 timeupdate 回写把滑块拽回去。 */
const dragging = ref(false);
const dragValue = ref(0);

const visible = computed(() => audio.status === 'playing' || audio.status === 'loading');
const percent = computed(() => audio.progress * 100);
/** TTS 降级朗读无时间轴, 不可定位。 */
const seekable = computed(() => audio.duration > 0 && !audio.usingTts);
const sliderValue = computed(() => (dragging.value ? dragValue.value : percent.value));
const roundedPercent = computed(() => Math.round(sliderValue.value));

function toggle(): void {
  if (audio.status === 'playing') audio.pause();
}

/** 拖动/点击/方向键均触发 input, 实时定位。 */
function onSeek(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value);
  if (!Number.isFinite(value)) return;
  dragging.value = true;
  dragValue.value = value;
  audio.seek(value / 100);
}

function onSeekEnd(): void {
  dragging.value = false;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const total = Math.floor(seconds);
  const mm = Math.floor(total / 60);
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

const timeText = computed(() =>
  seekable.value ? `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}` : '',
);
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
      <p class="dock__label jp">
        <span class="dock__title">{{ audio.label || '正在播放' }}</span>
        <span v-if="timeText" class="dock__time">{{ timeText }}</span>
      </p>
      <input
        class="dock__range"
        type="range"
        min="0"
        max="100"
        step="0.1"
        aria-label="播放进度，可拖动定位"
        :value="sliderValue"
        :aria-valuetext="`${roundedPercent}%`"
        :disabled="!seekable"
        :style="{ '--dock-fill': roundedPercent + '%' }"
        @input="onSeek"
        @change="onSeekEnd"
        @pointerup="onSeekEnd"
        @blur="onSeekEnd"
      />
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
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text);
}

.dock__title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dock__time {
  margin-left: auto;
  flex: none;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-meta);
  font-variant-numeric: tabular-nums;
}

/* 进度条 = 原生 range, 天然支持点击/拖动/方向键定位与无障碍。 */
.dock__range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 16px;
  margin: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
  touch-action: none;
}

.dock__range:disabled {
  cursor: default;
  opacity: 0.6;
}

.dock__range::-webkit-slider-runnable-track {
  height: 3px;
  border-radius: var(--radius-pill);
  background: linear-gradient(
    to right,
    var(--color-primary) var(--dock-fill, 0%),
    var(--color-surface-2) var(--dock-fill, 0%)
  );
}

.dock__range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  margin-top: -4.5px;
  border: 2px solid var(--color-surface);
  border-radius: var(--radius-pill);
  background: var(--color-primary);
  transition: transform var(--motion-fast) var(--ease);
}

.dock__range:hover::-webkit-slider-thumb,
.dock__range:focus-visible::-webkit-slider-thumb {
  transform: scale(1.25);
}

.dock__range::-moz-range-track {
  height: 3px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-2);
}

.dock__range::-moz-range-progress {
  height: 3px;
  border-radius: var(--radius-pill);
  background: var(--color-primary);
}

.dock__range::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: 2px solid var(--color-surface);
  border-radius: var(--radius-pill);
  background: var(--color-primary);
  transition: transform var(--motion-fast) var(--ease);
}

.dock__range:hover::-moz-range-thumb,
.dock__range:focus-visible::-moz-range-thumb {
  transform: scale(1.25);
}

.dock__stop {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  color: var(--color-text-meta);
}

/* 桌面端: 不再隐藏(听解练习同样需要定位), 收成右下角浮层。 */
@media (min-width: 961px) {
  .dock {
    left: auto;
    right: var(--space-6);
    bottom: var(--space-6);
    width: min(380px, calc(100vw - var(--space-6) * 2));
  }
}

@media (prefers-reduced-motion: reduce) {
  .dock__range::-webkit-slider-thumb,
  .dock__range::-moz-range-thumb {
    transition: none;
  }
}
</style>
