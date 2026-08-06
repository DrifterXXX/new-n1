<script setup lang="ts">
/**
 * 汉字学习卡片模式: 隐藏 reading, 点击显示, 自评, AI 生成学习例句。
 */
import { computed, onMounted, ref } from 'vue';
import AppButton from '@/components/common/AppButton.vue';
import AudioBtn from '@/components/common/AudioBtn.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { kanjiAudio, kanjiExampleAudio } from '@/services/audio-path';
import {
  findExampleById,
  loadKanjiExamples,
  type KanjiExampleEntry,
  type KanjiExamplesData,
} from '@/services/kanji-examples-service';
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

const examplesData = ref<KanjiExamplesData | null>(null);
const examplesError = ref(false);

onMounted(async () => {
  try {
    examplesData.value = await loadKanjiExamples();
  } catch {
    examplesError.value = true;
  }
});

const currentCard = computed<KanjiEntry | undefined>(
  () => kanji.search('')[cardIndex.value],
);

const currentExample = computed<KanjiExampleEntry | undefined>(() => {
  if (!examplesData.value || !currentCard.value) return undefined;
  return findExampleById(examplesData.value, currentCard.value.id);
});

const audioKey = computed(() => currentCard.value ? `kanji:${currentCard.value.id}` : null);
const audioStatus = computed(() => {
  if (!audioKey.value || audio.currentKey !== audioKey.value) return 'idle' as const;
  return audio.status;
});

const exampleAudioKey = computed(() => currentCard.value ? `kanji-example:${currentCard.value.id}` : null);
const exampleAudioStatus = computed(() => {
  if (!exampleAudioKey.value || audio.currentKey !== exampleAudioKey.value) return 'idle' as const;
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

function playExampleAudio(): void {
  const card = currentCard.value;
  const example = currentExample.value;
  if (!card || !example) return;
  const num = parseInt(card.id.replace('kanji-', ''), 10);
  audio.toggle(exampleAudioKey.value!, kanjiExampleAudio(num), {
    text: example.sentenceJa,
    label: `${card.term} 例句`,
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

          <!-- AI 生成学习例句 -->
          <div v-if="currentExample" class="kanji-example">
            <span class="kanji-example__label">AI 生成学习例句</span>
            <span class="kanji-example__ja jp">{{ currentExample.sentenceJa }}</span>
            <span class="kanji-example__zh">{{ currentExample.translationZh }}</span>
            <AudioBtn
              :label="`播放 ${currentCard.term} 的例句`"
              :status="exampleAudioStatus"
              :using-tts="exampleAudioStatus === 'playing' && audio.usingTts"
              variant="ghost"
              @click.stop="playExampleAudio"
            />
          </div>
          <div v-else-if="examplesError" class="kanji-example kanji-example--error">
            <span class="kanji-example__label">AI 生成学习例句</span>
            <span class="kanji-example__error-text">例句加载失败</span>
          </div>
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

.card-flip--revealed {
  min-height: 340px;
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

/* AI 生成学习例句 */
.kanji-example {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding: var(--space-3);
  border-top: 1px solid var(--color-border);
  width: 100%;
}

.kanji-example--error {
  opacity: 0.6;
}

.kanji-example__label {
  font-size: var(--text-xs);
  font-weight: var(--fw-emphasis);
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kanji-example__ja {
  font-size: var(--text-base);
  color: var(--color-text);
  text-align: center;
  line-height: 1.6;
}

.kanji-example__zh {
  font-size: var(--text-sm);
  color: var(--color-text-2);
  text-align: center;
}

.kanji-example__error-text {
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