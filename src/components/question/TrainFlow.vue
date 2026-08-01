<script setup lang="ts">
/** 答题流: 单题展示(听解音频优先 / 读解原文) + 选项 + 即时判定 + 键盘流。 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import AppButton from '@/components/common/AppButton.vue';
import AppIcon from '@/components/common/AppIcon.vue';
import AudioBtn from '@/components/common/AudioBtn.vue';
import OptionList from '@/components/common/OptionList.vue';
import Tag from '@/components/common/Tag.vue';
import { listeningAudio } from '@/services/audio-path';
import { useAudioStore } from '@/stores/audio';
import { useSessionStore } from '@/stores/session';

const session = useSessionStore();
const audio = useAudioStore();

const showScript = ref(false);

const q = computed(() => session.currentQuestion);
const chosen = computed(() => session.currentChoice);
const answered = computed(() => chosen.value !== null);
const correct = computed(
  () => answered.value && q.value !== null && chosen.value === q.value.answer,
);
const audioKey = computed(() =>
  session.currentItem ? `listening:${session.currentItem.id}` : '',
);
const audioStatus = computed(() =>
  audio.currentKey === audioKey.value ? audio.status : 'idle',
);
const barWidth = computed(() =>
  session.size === 0 ? '0%' : Math.round(((session.index + 1) / session.size) * 100) + '%',
);

function playListening(): void {
  const item = session.currentItem;
  if (!item || item.kind !== 'listening') return;
  audio.toggle(audioKey.value, listeningAudio(item.id), {
    text: q.value?.script,
    label: `${item.type} No.${item.id}`,
  });
}

function pick(index: number): void {
  session.answer(index);
}

function goNext(): void {
  showScript.value = false;
  audio.stop();
  session.next();
}

function goPrev(): void {
  showScript.value = false;
  session.prev();
}

function onKeydown(e: KeyboardEvent): void {
  if (!session.active || session.finished) return;
  const target = e.target as HTMLElement | null;
  if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
  if (['1', '2', '3', '4'].includes(e.key)) {
    const idx = Number(e.key) - 1;
    if (q.value && idx < q.value.options.length) pick(idx);
    return;
  }
  if (e.key === 'Enter' || e.key === 'ArrowRight') goNext();
  else if (e.key === 'ArrowLeft') goPrev();
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  audio.stop();
});
</script>

<template>
  <section class="card flow">
    <header class="flow__head">
      <div class="flow__meta">
        <Tag :label="session.currentItem?.type ?? '训练'" tone="primary" />
        <span class="mono flow__count">{{ session.index + 1 }} / {{ session.size }}</span>
      </div>
      <AppButton size="sm" variant="ghost" icon="x" @click="session.quit()">退出</AppButton>
    </header>
    <div class="flow__bar"><span class="flow__fill" :style="{ width: barWidth }" /></div>

    <template v-if="q">
      <div v-if="session.currentItem?.kind === 'listening'" class="flow__audio">
        <AudioBtn
          :label="`播放第 ${session.index + 1} 题音频`"
          :status="audioStatus"
          :using-tts="audioStatus === 'playing' && audio.usingTts"
          text="播放音频"
          @click="playListening"
        />
        <span class="meta">先听两遍再选，原文答完题才展开。</span>
      </div>

      <div v-if="q.article" class="flow__article">
        <p v-for="(p, i) in q.article.split('\n').filter(Boolean)" :key="i" class="flow__p">{{ p }}</p>
        <template v-if="q.articleB">
          <p class="caps">文章 B</p>
          <p v-for="(p, i) in q.articleB.split('\n').filter(Boolean)" :key="`b${i}`" class="flow__p">
            {{ p }}
          </p>
        </template>
      </div>

      <p class="flow__prompt jp">{{ q.prompt }}</p>

      <OptionList :options="q.options" :answer="q.answer" :chosen="chosen" @select="pick" />

      <div v-if="answered" class="flow__explain">
        <p class="flow__verdict" :class="correct ? 'is-correct' : 'is-wrong'">
          <AppIcon :name="correct ? 'circle-check' : 'circle-x'" :size="16" />
          {{ correct ? '答对了，保持这个节奏' : `正解是第 ${q.answer + 1} 项` }}
        </p>
        <p v-if="q.explanation" class="cn">{{ q.explanation }}</p>
        <button
          v-if="q.script"
          type="button"
          class="flow__toggle"
          :aria-expanded="showScript ? 'true' : 'false'"
          @click="showScript = !showScript"
        >
          <AppIcon :name="showScript ? 'chevron-up' : 'chevron-down'" :size="16" />
          {{ showScript ? '收起原文' : '展开原文' }}
        </button>
        <p v-if="showScript && q.script" class="jp flow__script">{{ q.script }}</p>
      </div>
    </template>
    <p v-else class="meta">这道题的数据缺失，已跳过，按 → 继续下一题。</p>

    <footer class="flow__foot">
      <AppButton icon="arrow-left" :disabled="session.index === 0" @click="goPrev">上一题</AppButton>
      <span class="meta">键盘 1–4 选项 · Enter 下一题</span>
      <AppButton variant="primary" icon-right="arrow-right" @click="goNext">
        {{ session.index + 1 === session.size ? '完成这组' : '下一题' }}
      </AppButton>
    </footer>
  </section>
</template>

<style scoped>
.flow {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
}

.flow__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flow__meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.flow__count {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.flow__bar {
  height: 3px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-2);
  overflow: hidden;
}

.flow__fill {
  display: block;
  height: 100%;
  background: var(--color-primary);
  transition: width var(--motion-base) var(--ease);
}

.flow__audio {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.flow__article {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-height: 320px;
  overflow-y: auto;
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
}

.flow__p {
  max-width: 40em;
  font-family: var(--font-reading);
  font-size: var(--text-md);
  line-height: var(--leading-reading);
}

.flow__prompt {
  font-size: var(--text-lg);
  color: var(--color-text);
}

.flow__explain {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  animation: slide-down var(--motion-base) var(--ease);
}

@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .flow__explain {
    animation: none;
  }
}

.flow__verdict {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--fw-emphasis);
}

.flow__verdict.is-correct {
  color: var(--color-success-strong);
}
.flow__verdict.is-wrong {
  color: var(--color-danger-strong);
}

.flow__toggle {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 36px;
  font-size: var(--text-sm);
  color: var(--color-text-2);
}

.flow__script {
  white-space: pre-wrap;
  font-size: var(--text-base);
}

.flow__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

@media (max-width: 960px) {
  .flow__foot {
    justify-content: center;
  }
}
</style>
