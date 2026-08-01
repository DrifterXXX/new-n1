<script setup lang="ts">
/** 例文单行: 日文大字 + 中文译文 + 文法/词汇 Tag + 音频 + 收藏。 */
import { computed } from 'vue';
import AppIcon from '@/components/common/AppIcon.vue';
import AudioBtn from '@/components/common/AudioBtn.vue';
import Tag from '@/components/common/Tag.vue';
import { exampleAudio } from '@/services/audio-path';
import { useAudioStore } from '@/stores/audio';
import { useFavoritesStore } from '@/stores/favorites';
import type { Example } from '@/types/domain';

const props = withDefaults(defineProps<{ example: Example; keyword?: string }>(), { keyword: '' });

const audio = useAudioStore();
const favorites = useFavoritesStore();

const key = computed(() => `example:${props.example.id}`);
const status = computed(() => (audio.currentKey === key.value ? audio.status : 'idle'));
const faved = computed(() => favorites.isFav('example', props.example.id));

/** 关键词命中高亮: 拆成 [文本, 是否命中] 片段。 */
function segments(text: string): Array<{ t: string; hit: boolean }> {
  const kw = props.keyword.trim();
  if (!kw) return [{ t: text, hit: false }];
  const lower = text.toLowerCase();
  const target = kw.toLowerCase();
  const out: Array<{ t: string; hit: boolean }> = [];
  let from = 0;
  for (;;) {
    const at = lower.indexOf(target, from);
    if (at === -1) break;
    if (at > from) out.push({ t: text.slice(from, at), hit: false });
    out.push({ t: text.slice(at, at + target.length), hit: true });
    from = at + target.length;
  }
  if (from < text.length) out.push({ t: text.slice(from), hit: false });
  return out.length > 0 ? out : [{ t: text, hit: false }];
}

function onPlay(): void {
  audio.toggle(key.value, exampleAudio(props.example.id), {
    text: props.example.jp,
    label: props.example.jp.slice(0, 24),
  });
}
</script>

<template>
  <article class="row card">
    <div class="row__body">
      <p class="row__jp jp">
        <span v-for="(seg, i) in segments(example.jp)" :key="i" :class="{ hit: seg.hit }">{{ seg.t }}</span>
      </p>
      <p class="row__cn cn">
        <span v-for="(seg, i) in segments(example.cn)" :key="i" :class="{ hit: seg.hit }">{{ seg.t }}</span>
      </p>
      <div class="row__tags">
        <Tag v-if="example.grammar" :label="example.grammar" tone="primary" />
        <Tag v-if="example.vocab" :label="example.vocab" />
        <span class="row__id mono">No.{{ example.id }}</span>
      </div>
    </div>
    <div class="row__actions">
      <AudioBtn
        :label="`播放第 ${example.id} 条例文`"
        :status="status"
        :using-tts="status === 'playing' && audio.usingTts"
        variant="ghost"
        @click="onPlay"
      />
      <button
        type="button"
        class="row__fav"
        :class="{ 'is-on': faved }"
        :aria-pressed="faved ? 'true' : 'false'"
        :aria-label="faved ? '取消收藏这条例文' : '收藏这条例文'"
        @click="favorites.toggle('example', example.id)"
      >
        <AppIcon name="bookmark" :size="16" />
      </button>
    </div>
  </article>
</template>

<style scoped>
.row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
}

.row__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.row__jp {
  font-size: var(--text-lg);
  color: var(--color-text);
  user-select: text;
}

.row__cn {
  font-size: var(--text-base);
}

.hit {
  background: var(--color-warn-soft);
  border-radius: 2px;
}

.row__tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.row__id {
  font-size: var(--text-xs);
  color: var(--color-text-meta);
}

.row__actions {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.row__fav {
  display: grid;
  place-items: center;
  min-width: var(--tap-min);
  min-height: var(--tap-min);
  border-radius: var(--radius-pill);
  color: var(--color-text-meta);
  transition: color var(--motion-fast) var(--ease), background-color var(--motion-fast) var(--ease);
}

.row__fav:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}

.row__fav.is-on {
  color: var(--color-primary);
}

.row__fav.is-on :deep(svg) {
  fill: currentColor;
}
</style>
