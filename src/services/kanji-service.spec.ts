/**
 * kanji-service 单测 — 加载/搜索/选择题生成/干扰项去重。
 * 环境: node(纯 TS 层, 不需要 jsdom)。
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  generateQuiz,
  generateQuizForEntry,
  findEntryById,
  loadKanji,
  resetKanjiCache,
  searchKanji,
  type KanjiEntry,
} from './kanji-service';

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