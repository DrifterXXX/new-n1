<script setup lang="ts">
/**
 * 汉字学习卡片模式: 隐藏 reading, 点击显示, 自评。
 */
import { computed, ref } from 'vue';
import AppButton from '@/components/common/AppButton.vue';
import AudioBtn from '@/components/common/AudioBtn.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { kanjiAudio } from '@/services/audio-path';
import { useAudioStore } from '@/stores/audio';
import { useKanjiStore } from '@/stores/kanji';
import type { KanjiEntry } from '@/services/kanji-service';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const kanji = useKanjiStore();
const audio = useAudioStore();

const cardIndex = ref(0);
const cardRevealed = ref(false);

const currentCard = computed<KanjiEntry | undefined>(
  () => kanji.search('')[cardIndex.value],
);

const audioKey = computed(() => currentCard.value ? `kanji:${currentCard.value.id}` : null);
const audioStatus = computed(() => {
  if (!audioKey.value || audio.currentKey !== audioKey.value) return 'idle' as const;
  return audio.status;
});

function playAudio(): void {
  const card = currentCard.value;
  if (!card) return;
  const num = parseInt(card.id.replace('kanji-', ''), 10);
  audio.toggle(audioKey.value!, kanjiAudio(num), {
    text: card.reading,
    label: card.term,
  });
}

function reveal(): void {
  cardRevealed.value = true;
}

function rate(rating: '认识' | '模糊' | '不认识'): void {
  const entry = currentCard.value;
  if (!entry) return;
  kanji.recordSelfRating(entry, rating === '认识', rating);
  next();
}

function next(): void {
  const total = kanji.entries.length;
  if (cardIndex.value < total - 1) {
    cardIndex.value++;
    cardRevealed.value = false;
  } else {
    emit('back');
  }
}
</script>

<template>
  <div class="card-area">
    <div v-if="currentCard" class="card-progress">
      <span class="mono">{{ cardIndex + 1 }} / {{ kanji.entries.length }}</span>
    </div>

    <div
      v-if="currentCard"
      class="card card-flip"
      :class="{ 'card-flip--revealed': cardRevealed }"
      @click="reveal"
    >
      <div class="card-flip__inner">
        <div class="card-flip__front">
          <span class="card-flip__term jp">{{ currentCard.term }}</span>
          <AudioBtn
            :label="`播放 ${currentCard.term} 的读音`"
            :status="audioStatus"
            :using-tts="audioStatus === 'playing' && audio.usingTts"
            variant="ghost"
            @click.stop="playAudio"
          />
          <span class="card-flip__hint">点击显示读音</span>
        </div>
        <div class="card-flip__back">
          <span class="card-flip__term jp">{{ currentCard.term }}</span>
          <span class="card-flip__reading mono">{{ currentCard.reading }}</span>
        </div>
      </div>
    </div>

    <div v-if="cardRevealed" class="card-rating">
      <AppButton variant="primary" icon="check" @click="rate('认识')">
        认识
      </AppButton>
      <AppButton variant="secondary" icon="circle" @click="rate('模糊')">
        模糊
      </AppButton>
      <AppButton variant="danger" icon="x" @click="rate('不认识')">
        不认识
      </AppButton>
    </div>

    <EmptyState
      v-if="!currentCard"
      icon="layers"
      title="没有可显示的汉字"
      action-text="返回浏览"
      action-icon="arrow-left"
      @action="emit('back')"
    />
  </div>
</template>

<style scoped>
.card-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-6) 0;
}

.card-progress {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.card-flip {
  width: 100%;
  max-width: 360px;
  min-height: 200px;
  cursor: pointer;
  user-select: none;
  perspective: 600px;
}

.card-flip__inner {
  position: relative;
  width: 100%;
  min-height: 200px;
  transition: transform var(--motion-normal) var(--ease);
  transform-style: preserve-3d;
}

.card-flip--revealed .card-flip__inner {
  transform: rotateY(180deg);
}

.card-flip__front,
.card-flip__back {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-6);
  backface-visibility: hidden;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.card-flip__back {
  transform: rotateY(180deg);
}

.card-flip__term {
  font-size: var(--text-3xl);
  font-weight: var(--fw-bold);
  color: var(--color-text);
}

.card-flip__reading {
  font-size: var(--text-lg);
  color: var(--color-text-2);
}

.card-flip__hint {
  font-size: var(--text-sm);
  color: var(--color-text-meta);
}

.card-rating {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  justify-content: center;
}
</style>