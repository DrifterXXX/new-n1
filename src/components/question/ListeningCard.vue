<script setup lang="ts">
/**
 * 听解题卡: 整段音频(四态 + 倍速) → 作答 → 原文/解析。
 * 强制音频优先: 原文在作答前不可展开(PAGE-SPECS §4)。
 */
import { computed, ref } from 'vue';
import AppIcon from '@/components/common/AppIcon.vue';
import AudioBtn from '@/components/common/AudioBtn.vue';
import OptionList from '@/components/common/OptionList.vue';
import Tag from '@/components/common/Tag.vue';
import { listeningAudio, listeningOptionAudio } from '@/services/audio-path';
import { useAudioStore } from '@/stores/audio';
import { useFavoritesStore } from '@/stores/favorites';
import { useProgressStore } from '@/stores/progress';
import { useSettingsStore } from '@/stores/settings';
import type { ListeningQuestion } from '@/types/domain';

const props = defineProps<{ question: ListeningQuestion }>();

const audio = useAudioStore();
const favorites = useFavoritesStore();
const progress = useProgressStore();
const settings = useSettingsStore();

const showScript = ref(false);

const mainKey = computed(() => `listening:${props.question.id}`);
const mainStatus = computed(() => (audio.currentKey === mainKey.value ? audio.status : 'idle'));
const record = computed(() => progress.get('listening', props.question.id));
const chosen = computed<number | null>(() => record.value?.chosen ?? null);
const answered = computed(() => chosen.value !== null);
const faved = computed(() => favorites.isFav('listening', props.question.id));

const playingIndex = computed<number | null>(() => {
  const prefix = `listening:${props.question.id}:opt:`;
  if (!audio.currentKey || !audio.currentKey.startsWith(prefix)) return null;
  return Number(audio.currentKey.slice(prefix.length));
});

function playMain(): void {
  audio.toggle(mainKey.value, listeningAudio(props.question.id), {
    text: props.question.script,
    label: `${props.question.type} No.${props.question.id}`,
  });
}

function playOption(index: number): void {
  const text = props.question.options[index] ?? '';
  audio.toggle(`${mainKey.value}:opt:${index}`, listeningOptionAudio(props.question.id, index), {
    text,
    label: `选项 ${index + 1}`,
  });
}

function select(index: number): void {
  if (answered.value) return;
  progress.record({
    kind: 'listening',
    id: props.question.id,
    sub: null,
    chosen: index,
    correct: index === props.question.answer,
    meta: { type: props.question.type },
  });
  showScript.value = true;
}
</script>

<template>
  <article class="lc card">
    <header class="lc__head">
      <div class="lc__id">
        <Tag :label="question.type" tone="primary" />
        <span class="mono lc__no">No.{{ question.id }}</span>
      </div>
      <div class="lc__tools">
        <AudioBtn
          :label="`播放第 ${question.id} 题音频`"
          :status="mainStatus"
          :using-tts="mainStatus === 'playing' && audio.usingTts"
          text="听音频"
          @click="playMain"
        />
        <button
          type="button"
          class="lc__rate mono"
          :aria-label="`切换播放倍速，当前 ${settings.playbackRate} 倍`"
          @click="settings.cyclePlaybackRate()"
        >
          <AppIcon name="gauge" :size="16" />
          {{ settings.playbackRate }}x
        </button>
        <button
          type="button"
          class="lc__fav"
          :class="{ 'is-on': faved }"
          :aria-pressed="faved ? 'true' : 'false'"
          :aria-label="faved ? '取消收藏本题' : '收藏本题'"
          @click="favorites.toggle('listening', question.id)"
        >
          <AppIcon name="bookmark" :size="16" />
        </button>
      </div>
    </header>

    <p class="lc__prompt jp">{{ question.question || '内容に合うものを一つ選びなさい。' }}</p>

    <OptionList
      :options="question.options"
      :answer="question.answer"
      :chosen="chosen"
      with-audio
      :playing-index="playingIndex"
      :audio-status="audio.status"
      @select="select"
      @play-option="playOption"
    />

    <div class="lc__foot">
      <button
        type="button"
        class="lc__script-toggle"
        :disabled="!answered"
        :aria-expanded="showScript ? 'true' : 'false'"
        @click="showScript = !showScript"
      >
        <AppIcon :name="showScript ? 'chevron-up' : 'chevron-down'" :size="16" />
        {{ answered ? (showScript ? '收起原文' : '展开原文') : '先作答再看原文' }}
      </button>
      <p v-if="!answered" class="lc__hint">不要边看原文边选，先盲听两遍。</p>
    </div>

    <div v-if="answered && showScript" class="lc__script">
      <p class="caps">原文</p>
      <p class="jp lc__script-text">{{ question.script }}</p>
      <template v-if="question.explanation">
        <p class="caps">解析</p>
        <p class="cn">{{ question.explanation }}</p>
      </template>
    </div>
  </article>
</template>

<style scoped>
.lc {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
}

.lc__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.lc__id {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.lc__no {
  font-size: var(--text-xs);
  color: var(--color-text-meta);
}

.lc__tools {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.lc__rate {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: var(--tap-min);
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  color: var(--color-text-2);
  font-size: var(--text-sm);
}

.lc__rate:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}

.lc__fav {
  display: grid;
  place-items: center;
  min-width: var(--tap-min);
  min-height: var(--tap-min);
  border-radius: var(--radius-pill);
  color: var(--color-text-meta);
}

.lc__fav:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}

.lc__fav.is-on {
  color: var(--color-primary);
}

.lc__fav.is-on :deep(svg) {
  fill: currentColor;
}

.lc__prompt {
  font-size: var(--text-lg);
  color: var(--color-text);
}

.lc__foot {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.lc__script-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 36px;
  color: var(--color-text-2);
  font-size: var(--text-sm);
}

.lc__script-toggle:disabled {
  color: var(--color-text-meta);
}

.lc__hint {
  font-size: var(--text-xs);
  color: var(--color-text-meta);
}

.lc__script {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
}

.lc__script-text {
  font-size: var(--text-base);
  white-space: pre-wrap;
}
</style>
