<script setup lang="ts">
/**
 * 选项组(纯展示)。answer 已由 content-service 归一为 0-based, 此处严禁再 -1。
 * withAudio: 听解题每选项带独立听钮(option_audio), 点击不触发选择。
 */
import { computed } from 'vue';
import OptionButton from './OptionButton.vue';
import AudioBtn from './AudioBtn.vue';
import type { AudioStatus } from '@/stores/audio';

const props = withDefaults(
  defineProps<{
    options: string[];
    answer: number;
    chosen: number | null;
    withAudio?: boolean;
    playingIndex?: number | null;
    audioStatus?: AudioStatus;
  }>(),
  { withAudio: false, playingIndex: null, audioStatus: 'idle' },
);

defineEmits<{ (e: 'select', index: number): void; (e: 'play-option', index: number): void }>();

const locked = computed(() => props.chosen !== null);

function stateOf(index: number): 'idle' | 'correct' | 'wrong' | 'muted' {
  if (props.chosen === null) return 'idle';
  if (index === props.answer) return 'correct';
  if (index === props.chosen) return 'wrong';
  return 'muted';
}
</script>

<template>
  <ul class="options">
    <li v-for="(text, i) in options" :key="i">
      <OptionButton
        :index="i"
        :text="text"
        :state="stateOf(i)"
        :disabled="locked"
        @select="$emit('select', i)"
      >
        <template v-if="withAudio" #trailing>
          <AudioBtn
            variant="ghost"
            :status="playingIndex === i ? audioStatus : 'idle'"
            :label="`播放第 ${i + 1} 个选项`"
            @click="$emit('play-option', i)"
          />
        </template>
      </OptionButton>
    </li>
  </ul>
</template>

<style scoped>
.options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
