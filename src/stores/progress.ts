/**
 * 答题记录 / 正确率 / 错题回收(AC-01 ~ AC-03)。
 * 数据落在 user.state.answers, key = answerKey(kind, id, sub)。
 *
 * 掌握判定(AC-03): meta.streak 记录连续答对次数, >=3 视为掌握, 不再进入错题回收池。
 * 回收池判定(AC-02): meta.wrongCount > 0 的题一直留在错题本, 直到掌握。
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { answerKey, type AnswerRecord, type ContentKind } from '@/types/domain';
import { useUserStore } from './user';
import { useDailyStore } from './daily';
import { computeNextReview, type KanjiRating } from '@/services/kanji-srs';

/** 连续答对多少次算掌握(Spec 裁决: 3)。 */
export const MASTERY_STREAK = 3;

export interface AnswerEntry {
  key: string;
  record: AnswerRecord;
}

export interface RecordInput {
  kind: ContentKind;
  id: number;
  sub?: number | null;
  chosen: number;
  correct: boolean;
  meta?: { type?: string; title?: string };
  /** 汉字自评等级: 用于间隔复习调度。 */
  kanjiRating?: KanjiRating;
}

export const useProgressStore = defineStore('progress', () => {
  const user = useUserStore();
  const daily = useDailyStore();
  /** 清空错题的撤销缓冲(仅内存, 会话内有效)。 */
  const undoBuffer = ref<AnswerEntry[]>([]);

  const entries = computed<AnswerEntry[]>(() =>
    Object.entries(user.state.answers).map(([key, record]) => ({ key, record })),
  );

  const total = computed(() => entries.value.length);
  const correctCount = computed(() => entries.value.filter((e) => e.record.correct).length);
  const accuracy = computed(() =>
    total.value === 0 ? 0 : Math.round((correctCount.value / total.value) * 100),
  );

  function isMastered(record: AnswerRecord): boolean {
    return (record.meta.streak ?? 0) >= MASTERY_STREAK;
  }

  /** 错题回收池: 曾答错且未掌握。 */
  const wrongEntries = computed<AnswerEntry[]>(() =>
    entries.value
      .filter((e) => {
        const wrong = !e.record.correct || (e.record.meta.wrongCount ?? 0) > 0;
        return wrong && !isMastered(e.record);
      })
      .sort((a, b) => b.record.at - a.record.at),
  );

  const recentEntries = computed<AnswerEntry[]>(() =>
    [...entries.value].sort((a, b) => b.record.at - a.record.at),
  );

  const masteredCount = computed(() => entries.value.filter((e) => isMastered(e.record)).length);
  const wrongCount = computed(() => wrongEntries.value.length);

  /** 按内容类型统计正确率(meta.type 在答题时写入)。 */
  function statsByType(kind: ContentKind): Array<{ type: string; total: number; rate: number }> {
    const bucket = new Map<string, { total: number; correct: number }>();
    for (const { record } of entries.value) {
      if (record.kind !== kind) continue;
      const type = record.meta.type ?? '未分类';
      const cur = bucket.get(type) ?? { total: 0, correct: 0 };
      cur.total += 1;
      if (record.correct) cur.correct += 1;
      bucket.set(type, cur);
    }
    return [...bucket.entries()].map(([type, v]) => ({
      type,
      total: v.total,
      rate: v.total === 0 ? 0 : Math.round((v.correct / v.total) * 100),
    }));
  }

  function kindAccuracy(kind: ContentKind): { total: number; rate: number } {
    const list = entries.value.filter((e) => e.record.kind === kind);
    const ok = list.filter((e) => e.record.correct).length;
    return { total: list.length, rate: list.length === 0 ? 0 : Math.round((ok / list.length) * 100) };
  }

  function get(kind: ContentKind, id: number, sub: number | null = null): AnswerRecord | undefined {
    return user.state.answers[answerKey(kind, id, sub)];
  }

  /** 记录一次作答(AC-01), 同时维护 streak / wrongCount 并登记今日完成。 */
  function record(input: RecordInput): AnswerRecord {
    const sub = input.sub ?? null;
    const key = answerKey(input.kind, input.id, sub);
    const prev = user.state.answers[key];
    const streak = input.correct ? (prev?.meta.streak ?? 0) + 1 : 0;
    const wrongTimes = (prev?.meta.wrongCount ?? 0) + (input.correct ? 0 : 1);
    // 汉字间隔复习: 根据自评等级与先前 streak 计算下次复习时间
    let nextReviewAt = prev?.nextReviewAt;
    if (input.kind === 'kanji' && input.kanjiRating) {
      nextReviewAt = computeNextReview(input.kanjiRating, prev?.meta.streak ?? 0);
    }
    const next: AnswerRecord = {
      kind: input.kind,
      id: input.id,
      sub,
      correct: input.correct,
      chosen: input.chosen,
      meta: {
        type: input.meta?.type ?? prev?.meta.type,
        title: input.meta?.title ?? prev?.meta.title,
        note: prev?.meta.note,
        streak,
        wrongCount: wrongTimes,
      },
      at: Date.now(),
      ...(nextReviewAt !== undefined ? { nextReviewAt } : {}),
    };
    user.state.answers[key] = next;
    daily.markDone(key);
    return next;
  }

  /** 错因备注(错题本 ErrorNote, blur 即存)。 */
  function setNote(key: string, note: string): void {
    const record_ = user.state.answers[key];
    if (!record_) return;
    record_.meta.note = note.trim() || undefined;
  }

  /** 清空错题记录(破坏性, 需二次确认); 保留撤销缓冲。 */
  function clearWrong(): number {
    undoBuffer.value = wrongEntries.value.map((e) => ({ key: e.key, record: e.record }));
    for (const { key } of undoBuffer.value) delete user.state.answers[key];
    return undoBuffer.value.length;
  }

  /** 撤销上一次清空。 */
  function undoClearWrong(): number {
    const count = undoBuffer.value.length;
    for (const { key, record: r } of undoBuffer.value) user.state.answers[key] = r;
    undoBuffer.value = [];
    return count;
  }

  return {
    entries,
    total,
    correctCount,
    accuracy,
    wrongEntries,
    wrongCount,
    recentEntries,
    masteredCount,
    isMastered,
    statsByType,
    kindAccuracy,
    get,
    record,
    setNote,
    clearWrong,
    undoClearWrong,
  };
});
