<script setup lang="ts">
/** 错题本单条记录: 题型标签 + 题干 + 对错比对 + 错因备注。 */
import AppIcon from '@/components/common/AppIcon.vue';
import Tag from '@/components/common/Tag.vue';
import { useProgressStore } from '@/stores/progress';

export interface ReviewRow {
  key: string;
  kind: 'listening' | 'reading' | 'example';
  id: number;
  sub: number | null;
  typeLabel: string;
  text: string;
  correct: boolean | null;
  chosen: number | null;
  answer: number | null;
  note: string;
  at: number;
}

const props = defineProps<{ row: ReviewRow; editable: boolean }>();

const progress = useProgressStore();

const KIND_LABEL: Record<ReviewRow['kind'], string> = {
  listening: '听解',
  reading: '读解',
  example: '例文',
};

function saveNote(e: Event): void {
  progress.setNote(props.row.key, (e.target as HTMLTextAreaElement).value);
}

function formatDate(at: number): string {
  const d = new Date(at);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
</script>

<template>
  <li class="card item">
    <div class="item__head">
      <div class="item__meta">
        <Tag :label="KIND_LABEL[row.kind]" tone="primary" />
        <Tag :label="row.typeLabel" />
        <span class="mono item__time">{{ formatDate(row.at) }}</span>
      </div>
      <span v-if="row.correct === false" class="item__flag is-wrong">
        <AppIcon name="circle-x" :size="16" />答错
      </span>
      <span v-else-if="row.correct === true" class="item__flag is-right">
        <AppIcon name="circle-check" :size="16" />答对
      </span>
    </div>

    <p class="item__text jp">{{ row.text }}</p>

    <p v-if="row.chosen !== null" class="item__compare mono">
      你选 {{ row.chosen + 1 }}
      <template v-if="row.answer !== null"> · 正解 {{ row.answer + 1 }}</template>
    </p>

    <label v-if="editable" class="item__note">
      <span class="caps"><AppIcon name="pencil" :size="16" /> 错因备注</span>
      <textarea
        class="item__note-input cn"
        rows="2"
        :value="row.note"
        placeholder="写一句为什么错，例如「没听清否定形」"
        @blur="saveNote"
      />
    </label>
  </li>
</template>

<style scoped>
.item {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
}

.item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.item__meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.item__time {
  font-size: var(--text-xs);
  color: var(--color-text-meta);
}

.item__flag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  font-weight: var(--fw-emphasis);
}

.item__flag.is-wrong {
  color: var(--color-danger-strong);
}
.item__flag.is-right {
  color: var(--color-success-strong);
}

.item__text {
  font-size: var(--text-base);
  color: var(--color-text);
}

.item__compare {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.item__note {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.item__note .caps {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.item__note-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-text);
  font-size: var(--text-sm);
  line-height: var(--leading-body);
  resize: vertical;
}

.item__note-input:focus {
  outline: none;
  border-color: var(--color-primary);
}
</style>
