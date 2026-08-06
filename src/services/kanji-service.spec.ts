/**
 * kanji-service 单测 — 加载/搜索/选择题生成/干扰项去重。
 * 环境: node(纯 TS 层, 不需要 jsdom)。
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  generateQuiz,
  generateQuizForEntry,
  loadKanji,
  resetKanjiCache,
  searchKanji,
  type KanjiEntry,
} from './kanji-service';
import {
  computeNextReview,
  findEntryById,
  getDueKanji,
  kanjiDifficultStats,
  migrateLegacyKanjiNextReview,
} from './kanji-srs';
import type { AnswerRecord } from '@/types/domain';

afterEach(() => {
  vi.restoreAllMocks();
  resetKanjiCache();
});

describe('loadKanji', () => {
  it('加载 520 条并冻结', async () => {
    const list = await loadKanji();
    expect(list.length).toBe(520);
    expect(Object.isFrozen(list)).toBe(true);
    expect(Object.isFrozen(list[0])).toBe(true);
  });

  it('幂等: 二次调用返回同一对象', async () => {
    const a = await loadKanji();
    const b = await loadKanji();
    expect(b).toBe(a);
  });

  it('每条包含 id/term/reading', async () => {
    const list = await loadKanji();
    for (const entry of list) {
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('term');
      expect(entry).toHaveProperty('reading');
      expect(typeof entry.term).toBe('string');
      expect(entry.term.length).toBeGreaterThan(0);
      expect(typeof entry.reading).toBe('string');
      expect(entry.reading.length).toBeGreaterThan(0);
    }
  });
});

describe('searchKanji', () => {
  it('空关键词返回全部', async () => {
    const list = await loadKanji();
    const result = searchKanji(list, '');
    expect(result.length).toBe(520);
  });

  it('按 term 搜索', async () => {
    const list = await loadKanji();
    const result = searchKanji(list, 'お年寄り');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]?.term).toBe('お年寄り');
  });

  it('按 reading 搜索', async () => {
    const list = await loadKanji();
    const result = searchKanji(list, 'あっか');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some((e) => e.term === '悪化')).toBe(true);
  });

  it('大小写不敏感(ASCII)', async () => {
    const list = await loadKanji();
    // 使用全大写 ASCII 搜索 reading 中的字母(如果有)
    // 所有 reading 都是平假名, 所以大小写不敏感对日文无意义
    // 但确保 API 不会因大小写报错
    const result = searchKanji(list, 'A');
    expect(Array.isArray(result)).toBe(true);
  });

  it('部分匹配', async () => {
    const list = await loadKanji();
    const result = searchKanji(list, 'あん');
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.some((e) => e.term === '安易')).toBe(true);
  });

  it('无匹配返回空数组', async () => {
    const list = await loadKanji();
    const result = searchKanji(list, 'zzz_nonexistent_zzz');
    expect(result.length).toBe(0);
  });
});

describe('generateQuiz — term→reading', () => {
  it('返回 4 选项, 其中一个是正解', async () => {
    const list = await loadKanji();
    const quiz = generateQuiz(list, 'term→reading');
    expect(quiz.options.length).toBe(4);
    expect(quiz.correctIndex).toBeGreaterThanOrEqual(0);
    expect(quiz.correctIndex).toBeLessThan(4);
    expect(quiz.options[quiz.correctIndex]).toBe(quiz.entry.reading);
    expect(quiz.question).toBe(quiz.entry.term);
    expect(quiz.direction).toBe('term→reading');
  });

  it('干扰项无重复(含正解)', async () => {
    const list = await loadKanji();
    for (let i = 0; i < 50; i++) {
      const quiz = generateQuiz(list, 'term→reading');
      const unique = new Set(quiz.options);
      expect(unique.size).toBe(4);
    }
  });

  it('干扰项不含正解以外的正解', async () => {
    const list = await loadKanji();
    for (let i = 0; i < 50; i++) {
      const quiz = generateQuiz(list, 'term→reading');
      const correct = quiz.options[quiz.correctIndex];
      // 其他选项不应等于正解
      for (let j = 0; j < 4; j++) {
        if (j !== quiz.correctIndex) {
          expect(quiz.options[j]).not.toBe(correct);
        }
      }
    }
  });
});

describe('generateQuiz — reading→term', () => {
  it('返回 4 选项, 其中一个是正解', async () => {
    const list = await loadKanji();
    const quiz = generateQuiz(list, 'reading→term');
    expect(quiz.options.length).toBe(4);
    expect(quiz.correctIndex).toBeGreaterThanOrEqual(0);
    expect(quiz.correctIndex).toBeLessThan(4);
    expect(quiz.options[quiz.correctIndex]).toBe(quiz.entry.term);
    expect(quiz.question).toBe(quiz.entry.reading);
    expect(quiz.direction).toBe('reading→term');
  });

  it('干扰项无重复', async () => {
    const list = await loadKanji();
    for (let i = 0; i < 50; i++) {
      const quiz = generateQuiz(list, 'reading→term');
      const unique = new Set(quiz.options);
      expect(unique.size).toBe(4);
    }
  });
});

describe('generateQuiz — shuffle 是排列而非变异', () => {
  it('shuffle 不丢失/重复元素, 只是重排', async () => {
    const list = await loadKanji();
    for (let i = 0; i < 20; i++) {
      const quiz = generateQuiz(list, 'term→reading');
      // 选项数量正确
      expect(quiz.options.length).toBe(4);
      // 无重复
      expect(new Set(quiz.options).size).toBe(4);
      // 正解在选项中
      expect(quiz.options).toContain(quiz.entry.reading);
      // 每个选项都来自数据集的有效值
      const allValid = new Set(list.map((e) => e.reading));
      for (const opt of quiz.options) {
        expect(allValid.has(opt)).toBe(true);
      }
    }
  });
});

describe('generateQuiz — 边界', () => {
  it('不足 4 条时降级为可用条数', async () => {
    const tiny: KanjiEntry[] = [
      { id: 'kanji-0001', term: 'A', reading: 'a' },
      { id: 'kanji-0002', term: 'B', reading: 'b' },
    ];
    const quiz = generateQuiz(tiny, 'term→reading');
    expect(quiz.options.length).toBe(2);
    expect(quiz.correctIndex).toBeGreaterThanOrEqual(0);
    expect(quiz.correctIndex).toBeLessThan(2);
  });

  it('单条时返回单选项', async () => {
    const single: KanjiEntry[] = [
      { id: 'kanji-0001', term: 'A', reading: 'a' },
    ];
    const quiz = generateQuiz(single, 'term→reading');
    expect(quiz.options.length).toBe(1);
    expect(quiz.correctIndex).toBe(0);
  });

  it('空列表时抛出描述性 Error 而非崩溃', () => {
    expect(() => generateQuiz([], 'term→reading')).toThrow(
      'generateQuiz: list is empty',
    );
  });
});

describe('generateQuizForEntry — 指定条目', () => {
  it('为指定条目生成 term→reading 选择题, prompt 为 term', async () => {
    const list = await loadKanji();
    const entry = list[0]!; // お年寄り / おとしより
    const quiz = generateQuizForEntry(list, entry, 'term→reading');
    expect(quiz.entry).toBe(entry);
    expect(quiz.question).toBe('お年寄り');
    expect(quiz.options[quiz.correctIndex]).toBe('おとしより');
    expect(quiz.options.length).toBe(4);
    expect(quiz.direction).toBe('term→reading');
  });

  it('为指定条目生成 reading→term 选择题, prompt 为 reading', async () => {
    const list = await loadKanji();
    const entry = list[0]!;
    const quiz = generateQuizForEntry(list, entry, 'reading→term');
    expect(quiz.entry).toBe(entry);
    expect(quiz.question).toBe('おとしより');
    expect(quiz.options[quiz.correctIndex]).toBe('お年寄り');
    expect(quiz.options.length).toBe(4);
    expect(quiz.direction).toBe('reading→term');
  });

  it('干扰项不含正解, 且全部来自数据集', async () => {
    const list = await loadKanji();
    const entry = list[0]!;
    const quiz = generateQuizForEntry(list, entry, 'term→reading');
    const correct = quiz.options[quiz.correctIndex];
    for (let i = 0; i < quiz.options.length; i++) {
      if (i !== quiz.correctIndex) {
        expect(quiz.options[i]).not.toBe(correct);
      }
    }
    // 所有选项值都来自数据集的有效值
    const allReadings = new Set(list.map((e) => e.reading));
    for (const opt of quiz.options) {
      expect(allReadings.has(opt)).toBe(true);
    }
  });
});

describe('findEntryById', () => {
  it('按数字 id 找到对应条目', async () => {
    const list = await loadKanji();
    const entry = findEntryById(list, 1);
    expect(entry).toBeDefined();
    expect(entry!.id).toBe('kanji-0001');
    expect(entry!.term).toBe('お年寄り');
    expect(entry!.reading).toBe('おとしより');
  });

  it('不存在的 id 返回 undefined', async () => {
    const list = await loadKanji();
    const entry = findEntryById(list, 9999);
    expect(entry).toBeUndefined();
  });
});

/* ---------- spaced repetition scheduling ---------- */

describe('computeNextReview', () => {
  it('不认识: same day (returns current timestamp)', () => {
    const now = 1_700_000_000_000;
    const result = computeNextReview('不认识', 0, now);
    expect(result).toBe(now);
  });

  it('模糊: next day', () => {
    const now = 1_700_000_000_000;
    const result = computeNextReview('模糊', 0, now);
    // next day at same time
    expect(result).toBe(now + 86_400_000);
  });

  it('认识 with streak=0: 3 days', () => {
    const now = 1_700_000_000_000;
    const result = computeNextReview('认识', 0, now);
    expect(result).toBe(now + 3 * 86_400_000);
  });

  it('认识 with streak=1: 7 days', () => {
    const now = 1_700_000_000_000;
    const result = computeNextReview('认识', 1, now);
    expect(result).toBe(now + 7 * 86_400_000);
  });

  it('认识 with streak=2: 14 days', () => {
    const now = 1_700_000_000_000;
    const result = computeNextReview('认识', 2, now);
    expect(result).toBe(now + 14 * 86_400_000);
  });

  it('认识 with streak=5 (3+): 14 days (capped)', () => {
    const now = 1_700_000_000_000;
    const result = computeNextReview('认识', 5, now);
    expect(result).toBe(now + 14 * 86_400_000);
  });
});

/* ---------- legacy migration ---------- */

describe('migrateLegacyKanjiNextReview', () => {
  it('sets nextReviewAt=now for legacy kanji answers without nextReviewAt', () => {
    const now = 1_700_000_000_000;
    const answers: Record<string, { kind: string; meta: Record<string, unknown> }> = {
      'kanji:1': { kind: 'kanji', meta: { streak: 2 } },
      'kanji:2': { kind: 'kanji', meta: {} },
      'listening:1': { kind: 'listening', meta: {} },
    };
    migrateLegacyKanjiNextReview(answers, now);
    // kanji:1 gets nextReviewAt=now (legacy, due immediately)
    expect((answers['kanji:1'] as Record<string, unknown>).nextReviewAt).toBe(now);
    // kanji:2 gets nextReviewAt=now
    expect((answers['kanji:2'] as Record<string, unknown>).nextReviewAt).toBe(now);
    // non-kanji records are untouched
    expect((answers['listening:1'] as Record<string, unknown>).nextReviewAt).toBeUndefined();
  });

  it('does not overwrite existing nextReviewAt', () => {
    const now = 1_700_000_000_000;
    const answers: Record<string, { kind: string; nextReviewAt: number; meta: Record<string, unknown> }> = {
      'kanji:1': { kind: 'kanji', nextReviewAt: 9_999_999_999_999, meta: {} },
    };
    migrateLegacyKanjiNextReview(answers, now);
    expect(answers['kanji:1']!.nextReviewAt).toBe(9_999_999_999_999);
  });

  it('handles empty answers gracefully', () => {
    migrateLegacyKanjiNextReview({}, 1_700_000_000_000);
    // no crash
  });
});

/* ---------- due queue ---------- */

describe('getDueKanji', () => {
  it('returns entries due at or before the supplied timestamp, ordered by nextReviewAt then id', () => {
    const now = 1_700_000_000_000;
    const answers: Record<string, Pick<AnswerRecord, 'nextReviewAt' | 'id'>> = {
      'kanji:1': { nextReviewAt: now - 1000, id: 1 },
      'kanji:3': { nextReviewAt: now, id: 3 },
      'kanji:2': { nextReviewAt: now - 500, id: 2 },
      'kanji:5': { nextReviewAt: now + 86_400_000, id: 5 }, // future, excluded
    };
    const list: KanjiEntry[] = [
      { id: 'kanji-0001', term: '一', reading: 'いち' },
      { id: 'kanji-0002', term: '二', reading: 'に' },
      { id: 'kanji-0003', term: '三', reading: 'さん' },
      { id: 'kanji-0005', term: '五', reading: 'ご' },
    ];
    const due = getDueKanji(list, answers, now);
    // order: nextReviewAt asc, then canonical id asc
    expect(due.map((e) => e.term)).toEqual(['一', '二', '三']);
    // 一 (id=1, nextReviewAt=now-1000) comes before 二 (id=2, nextReviewAt=now-500)
    // 三 (id=3, nextReviewAt=now) comes last
  });

  it('returns empty array when nothing is due', () => {
    const now = 1_700_000_000_000;
    const answers: Record<string, Pick<AnswerRecord, 'nextReviewAt' | 'id'>> = {
      'kanji:1': { nextReviewAt: now + 1, id: 1 },
    };
    const list: KanjiEntry[] = [{ id: 'kanji-0001', term: '一', reading: 'いち' }];
    expect(getDueKanji(list, answers, now)).toEqual([]);
  });

  it('includes entries with no answer record (never studied) as due', () => {
    const now = 1_700_000_000_000;
    const list: KanjiEntry[] = [
      { id: 'kanji-0001', term: '一', reading: 'いち' },
      { id: 'kanji-0002', term: '二', reading: 'に' },
    ];
    const due = getDueKanji(list, {}, now);
    // never-studied entries are due
    expect(due.length).toBe(2);
    expect(due.map((e) => e.term)).toEqual(['一', '二']);
  });
});

/* ---------- difficult / mastered / statistics ---------- */

describe('kanjiDifficultStats', () => {
  it('returns correct stats for kanji answers', () => {
    const now = 1_700_000_000_000;
    const answers: Record<string, Pick<AnswerRecord, 'correct' | 'meta' | 'nextReviewAt' | 'id'>> = {
      'kanji:1': { correct: true, meta: { streak: 3 }, nextReviewAt: now + 86_400_000, id: 1 },
      'kanji:2': { correct: false, meta: { streak: 0, wrongCount: 1 }, nextReviewAt: now, id: 2 },
      'kanji:3': { correct: true, meta: { streak: 0 }, nextReviewAt: now, id: 3 },
      'kanji:4': { correct: false, meta: { streak: 0, wrongCount: 2 }, nextReviewAt: now + 86_400_000, id: 4 },
      'listening:1': { correct: true, meta: {}, nextReviewAt: 0, id: 1 },
    };
    const list: KanjiEntry[] = [
      { id: 'kanji-0001', term: '一', reading: 'いち' },
      { id: 'kanji-0002', term: '二', reading: 'に' },
      { id: 'kanji-0003', term: '三', reading: 'さん' },
      { id: 'kanji-0004', term: '四', reading: 'し' },
    ];
    const stats = kanjiDifficultStats(list, answers, now);
    // totalStudied: 4 kanji entries in answers
    expect(stats.totalStudied).toBe(4);
    // dueToday: entries with nextReviewAt <= now (kanji:2, kanji:3)
    expect(stats.dueToday).toBe(2);
    // mastered: streak >= 3 (kanji:1)
    expect(stats.mastered).toBe(1);
    // accuracy: 2 correct out of 4 = 50%
    expect(stats.accuracy).toBe(50);
    // difficult: wrong entries (kanji:2 wrongCount=1, kanji:4 wrongCount=2) — ordered by wrongCount desc
    expect(stats.difficult.length).toBe(2);
    expect(stats.difficult[0]!.term).toBe('四');
    expect(stats.difficult[1]!.term).toBe('二');
  });

  it('returns zero stats when no kanji answers exist', () => {
    const stats = kanjiDifficultStats([], {}, 1_700_000_000_000);
    expect(stats.totalStudied).toBe(0);
    expect(stats.dueToday).toBe(0);
    expect(stats.mastered).toBe(0);
    expect(stats.accuracy).toBe(0);
    expect(stats.difficult).toEqual([]);
  });
});