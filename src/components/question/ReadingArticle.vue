<script setup lang="ts">
/**
 * 读解单篇: 明朝体长文(統合理解 A/B 双栏) + 設問 n。
 * answer 已由 content-service 归一为 0-based, 此处严禁再 -1。
 */
import { computed, ref } from 'vue';
import AppIcon from '@/components/common/AppIcon.vue';
import OptionList from '@/components/common/OptionList.vue';
import Tag from '@/components/common/Tag.vue';
import { useFavoritesStore } from '@/stores/favorites';
import { useProgressStore } from '@/stores/progress';
import type { Reading } from '@/types/domain';

const props = defineProps<{ reading: Reading }>();

const favorites = useFavoritesStore();
const progress = useProgressStore();

const questionsAnchor = ref<HTMLElement | null>(null);

const faved = computed(() => favorites.isFav('reading', props.reading.id));
const isCombined = computed(() => Boolean(props.reading.contentA || props.reading.contentB));

function paragraphs(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n{1,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function chosenOf(sub: number): number | null {
  return progress.get('reading', props.reading.id, sub)?.chosen ?? null;
}

function select(sub: number, index: number): void {
  if (chosenOf(sub) !== null) return;
  const q = props.reading.questions[sub];
  if (!q) return;
  progress.record({
    kind: 'reading',
    id: props.reading.id,
    sub,
    chosen: index,
    correct: index === q.answer,
    meta: { type: props.reading.type, title: props.reading.title },
  });
}

function backToQuestions(): void {
  questionsAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<template>
  <article class="ra card">
    <header class="ra__head">
      <div class="ra__meta">
        <Tag :label="reading.type" tone="primary" />
        <h2 class="ra__title">{{ reading.title || `第 ${reading.id + 1} 篇` }}</h2>
      </div>
      <button
        type="button"
        class="ra__fav"
        :class="{ 'is-on': faved }"
        :aria-pressed="faved ? 'true' : 'false'"
        :aria-label="faved ? '取消收藏本篇' : '收藏本篇'"
        @click="favorites.toggle('reading', reading.id)"
      >
        <AppIcon name="bookmark" :size="16" />
      </button>
    </header>

    <div v-if="isCombined" class="ra__pair">
      <section class="ra__col">
        <p class="caps">文章 A</p>
        <p v-for="(p, i) in paragraphs(reading.contentA)" :key="`a${i}`" class="ra__p">{{ p }}</p>
      </section>
      <section class="ra__col">
        <p class="caps">文章 B</p>
        <p v-for="(p, i) in paragraphs(reading.contentB)" :key="`b${i}`" class="ra__p">{{ p }}</p>
      </section>
    </div>
    <section v-else class="ra__body">
      <p v-for="(p, i) in paragraphs(reading.content)" :key="i" class="ra__p">{{ p }}</p>
      <p v-if="paragraphs(reading.content).length === 0" class="meta">本篇正文缺失，可先看下方设问练判断。</p>
    </section>

    <div ref="questionsAnchor" class="ra__questions">
      <section v-for="(q, sub) in reading.questions" :key="sub" class="ra__q">
        <h3 class="ra__q-title jp">問{{ sub + 1 }}　{{ q.question }}</h3>
        <OptionList
          :options="q.options"
          :answer="q.answer"
          :chosen="chosenOf(sub)"
          @select="(i: number) => select(sub, i)"
        />
      </section>
    </div>

    <button type="button" class="ra__back" aria-label="回到设问" @click="backToQuestions">
      <AppIcon name="arrow-up" :size="16" />
      回到设问
    </button>
  </article>
</template>

<style scoped>
.ra {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-6);
}

.ra__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.ra__meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.ra__title {
  font-size: var(--text-xl);
  font-weight: var(--fw-emphasis);
  letter-spacing: var(--tracking-tight);
  color: var(--color-text);
}

.ra__fav {
  display: grid;
  place-items: center;
  min-width: var(--tap-min);
  min-height: var(--tap-min);
  border-radius: var(--radius-pill);
  color: var(--color-text-meta);
}

.ra__fav:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}

.ra__fav.is-on {
  color: var(--color-primary);
}

.ra__fav.is-on :deep(svg) {
  fill: currentColor;
}

.ra__pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--space-6);
}

.ra__col,
.ra__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.ra__p {
  max-width: 40em;
  font-family: var(--font-reading);
  font-size: var(--text-md);
  line-height: var(--leading-reading);
  letter-spacing: var(--tracking-jp);
  color: var(--color-text);
}

.ra__questions {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
  scroll-margin-top: var(--space-12);
}

.ra__q {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.ra__q-title {
  font-size: var(--text-base);
  font-weight: var(--fw-emphasis);
  color: var(--color-text);
}

.ra__back {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--tap-min);
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  color: var(--color-text-2);
  font-size: var(--text-sm);
}

.ra__back:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}

@media (max-width: 960px) {
  .ra {
    padding: var(--space-4);
  }
  .ra__pair {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-5);
  }
}
</style>
