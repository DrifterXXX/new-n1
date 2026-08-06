/**
 * kanji store 单测 — 加载/搜索/选择题/自评记录。
 * 需要 jsdom 环境(使用 Pinia)。
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useKanjiStore } from '@/stores/kanji';

describe('useKanjiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('初始状态: 未加载, 无错误', () => {
    const store = useKanjiStore();
    expect(store.ready).toBe(false);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(store.entries.length).toBe(0);
  });

  it('load() 加载 520 条', async () => {
    const store = useKanjiStore();
    await store.load();
    expect(store.ready).toBe(true);
    expect(store.loading).toBe(false);
    expect(store.entries.length).toBe(520);
  });

  it('search() 按 term 搜索', async () => {
    const store = useKanjiStore();
    await store.load();
    const result = store.search('お年寄り');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]?.term).toBe('お年寄り');
  });

  it('search() 按 reading 搜索', async () => {
    const store = useKanjiStore();
    await store.load();
    const result = store.search('あっか');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some((e) => e.term === '悪化')).toBe(true);
  });

  it('search() 空关键词返回全部', async () => {
    const store = useKanjiStore();
    await store.load();
    expect(store.search('').length).toBe(520);
  });

  it('generateQuizFor() 返回 4 选项 term→reading', async () => {
    const store = useKanjiStore();
    await store.load();
    const quiz = store.generateQuizFor('term→reading')!;
    expect(quiz.options.length).toBe(4);
    expect(quiz.correctIndex).toBeGreaterThanOrEqual(0);
    expect(quiz.correctIndex).toBeLessThan(4);
    expect(quiz.direction).toBe('term→reading');
  });

  it('generateQuizFor() 返回 4 选项 reading→term', async () => {
    const store = useKanjiStore();
    await store.load();
    const quiz = store.generateQuizFor('reading→term')!;
    expect(quiz.options.length).toBe(4);
    expect(quiz.direction).toBe('reading→term');
  });

  it('未加载时 generateQuizFor 返回 null 而非崩溃', () => {
    const store = useKanjiStore();
    // 未调用 load, entries 为空
    const quiz = store.generateQuizFor('term→reading');
    expect(quiz).toBeNull();
  });

  it('recordQuizAnswer 记录实际选项和正确下标', async () => {
    const store = useKanjiStore();
    await store.load();
    const quiz = store.generateQuizFor('term→reading')!;
    // 模拟用户选了第 2 项(下标 1)
    store.recordQuizAnswer(quiz, 1);
    const progress = (await import('@/stores/progress')).useProgressStore();
    const record = progress.get('kanji', parseInt(quiz.entry.id.replace('kanji-', ''), 10));
    expect(record).toBeDefined();
    expect(record!.chosen).toBe(1); // 实际用户选项
    expect(record!.correct).toBe(1 === quiz.correctIndex);
    expect(record!.meta.title).toBe(quiz.entry.term);
  });
});