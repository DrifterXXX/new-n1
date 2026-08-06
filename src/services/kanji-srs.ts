/**
 * kanji SRS (spaced repetition scheduling) 模块。
 * 自评等级、复习间隔、待复习队列、学习统计。
 * 从 kanji-service.ts 拆出以遵守 SPEC §10 单文件 ≤300 行约束。
 */
import type { KanjiEntry } from './kanji-service';
import type { AnswerRecord } from '@/types/domain';

/* ---------- 自评等级 ---------- */

export type KanjiRating = '认识' | '模糊' | '不认识';

/** 一天毫秒数。 */
const DAY_MS = 86_400_000;

/**
 * 根据自评等级和当前连续答对次数计算下次复习时间戳。
 * 不认识 => 当天(now); 模糊 => 次日; 认识 => 3/7/14 天(基于 streak)。
 */
export function computeNextReview(
  rating: KanjiRating,
  priorStreak: number,
  now: number = Date.now(),
): number {
  if (rating === '不认识') return now;
  if (rating === '模糊') return now + DAY_MS;
  // 认识: 基于 priorStreak 递增间隔
  if (priorStreak >= 2) return now + 14 * DAY_MS;
  if (priorStreak === 1) return now + 7 * DAY_MS;
  return now + 3 * DAY_MS;
}

/** 从 kanji ID 字符串提取数字部分, 用于 answerKey 兼容。 */
export function kanjiNumericId(id: string): number {
  const num = parseInt(id.replace('kanji-', ''), 10);
  return Number.isFinite(num) ? num : 0;
}

/** 从列表中按数字 id 查找对应条目(形如 kanji-NNNN)。 */
export function findEntryById(
  list: readonly KanjiEntry[],
  numericId: number,
): KanjiEntry | undefined {
  const target = `kanji-${String(numericId).padStart(4, '0')}`;
  return list.find((e) => e.id === target);
}

/**
 * 为所有缺少 nextReviewAt 的 kanji 答题记录设置 nextReviewAt=now,
 * 使其立即进入待复习队列。非 kanji 记录保持不变。
 * 幂等: 已有 nextReviewAt 的记录不会被覆盖。
 */
export function migrateLegacyKanjiNextReview(
  answers: Record<string, Record<string, unknown>>,
  now: number = Date.now(),
): void {
  for (const [key, rec] of Object.entries(answers)) {
    if (!key.startsWith('kanji:')) continue;
    if (rec.nextReviewAt !== undefined && rec.nextReviewAt !== null) continue;
    rec.nextReviewAt = now;
  }
}

/**
 * 获取当前时间戳下待复习的汉字列表。
 * 从未学习的条目直接视为待复习。
 * 结果按 nextReviewAt 升序, 其次按数字 id 升序。
 */
export function getDueKanji(
  list: readonly KanjiEntry[],
  answers: Record<string, Pick<AnswerRecord, 'nextReviewAt' | 'id'>>,
  now: number = Date.now(),
): KanjiEntry[] {
  const due: KanjiEntry[] = [];
  for (const entry of list) {
    const numericId = kanjiNumericId(entry.id);
    const key = `kanji:${numericId}`;
    const rec = answers[key];
    // 未学习 或 已到复习时间
    if (!rec || (rec.nextReviewAt !== undefined && rec.nextReviewAt <= now)) {
      due.push(entry);
    }
  }
  // 稳定排序: nextReviewAt 升序, 其次数字 id 升序
  due.sort((a, b) => {
    const idA = kanjiNumericId(a.id);
    const idB = kanjiNumericId(b.id);
    const keyA = `kanji:${idA}`;
    const keyB = `kanji:${idB}`;
    const recA = answers[keyA];
    const recB = answers[keyB];
    const nextA = recA?.nextReviewAt ?? 0;
    const nextB = recB?.nextReviewAt ?? 0;
    if (nextA !== nextB) return nextA - nextB;
    return idA - idB;
  });
  return due;
}

export interface KanjiStats {
  totalStudied: number;
  dueToday: number;
  mastered: number;
  accuracy: number;
  difficult: Array<{ term: string; reading: string; wrongCount: number }>;
}

/**
 * 计算汉字学习统计: 总学习数、今日待复习、已掌握、正确率、困难列表。
 * 困难列表仅包含实际 term/reading, 不发明含义。
 */
export function kanjiDifficultStats(
  list: readonly KanjiEntry[],
  answers: Record<string, Pick<AnswerRecord, 'correct' | 'meta' | 'nextReviewAt' | 'id'>>,
  now: number = Date.now(),
): KanjiStats {
  const kanjiAnswers = Object.entries(answers).filter(([key]) => key.startsWith('kanji:'));
  const totalStudied = kanjiAnswers.length;
  let dueToday = 0;
  let mastered = 0;
  let correctCount = 0;

  const difficult: KanjiStats['difficult'] = [];

  for (const [key, rec] of kanjiAnswers) {
    const numericId = parseInt(key.replace('kanji:', ''), 10);
    const entry = findEntryById(list, numericId);

    // 今日待复习
    if (rec.nextReviewAt !== undefined && rec.nextReviewAt <= now) {
      dueToday += 1;
    }

    // 掌握
    const streak = rec.meta?.streak ?? 0;
    if (streak >= 3) {
      mastered += 1;
    }

    // 正确
    if (rec.correct) {
      correctCount += 1;
    }

    // 困难: 曾答错
    const wrongCount = rec.meta?.wrongCount ?? 0;
    if (wrongCount > 0 && entry) {
      difficult.push({
        term: entry.term,
        reading: entry.reading,
        wrongCount,
      });
    }
  }

  // 困难列表按 wrongCount 降序, 其次 id 升序
  difficult.sort((a, b) => {
    if (b.wrongCount !== a.wrongCount) return b.wrongCount - a.wrongCount;
    // 按 term 稳定排序
    return a.term.localeCompare(b.term);
  });

  return {
    totalStudied,
    dueToday,
    mastered,
    accuracy: totalStudied === 0 ? 0 : Math.round((correctCount / totalStudied) * 100),
    difficult,
  };
}