/**
 * kanji store 单测 — 加载/搜索/选择题/自评记录。
 * 需要 jsdom 环境(使用 Pinia)。
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useKanjiStore } from '@/stores/kanji';
import type { AnswerRecord } from '@/types/domain';

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

  /**
   * P1 SRS: recordQuizAnswer 必须将 quiz 结果映射为显式 SRS rating 并持久化 nextReviewAt。
   * 答错('模糊') => nextReviewAt ≈ now+1天, 且到期后 dueKanji 包含该记录。
   * 推导理由见 kanji.ts recordQuizAnswer 的 JSDoc 注释。
   */
  it('recordQuizAnswer 答错时持久化 nextReviewAt ≈ now+1天, 到期后进入 dueKanji', async () => {
    const store = useKanjiStore();
    await store.load();
    const quiz = store.generateQuizFor('term→reading')!;
    const entryId = parseInt(quiz.entry.id.replace('kanji-', ''), 10);
    // 故意选错: chosen 与 correctIndex 不同
    const wrongChoice = (quiz.correctIndex + 1) % quiz.options.length;
    store.recordQuizAnswer(quiz, wrongChoice);
    const progress = (await import('@/stores/progress')).useProgressStore();
    const record = progress.get('kanji', entryId);
    expect(record).toBeDefined();
    // 答错 => correct=false
    expect(record!.correct).toBe(false);
    // nextReviewAt 必须存在且为有限值
    expect(record!.nextReviewAt).toBeDefined();
    expect(Number.isFinite(record!.nextReviewAt)).toBe(true);
    // 答错('模糊') => nextReviewAt ≈ now+1天, 允许 ±1s 偏差
    const now = Date.now();
    const expected = now + 86_400_000;
    const diff = Math.abs(record!.nextReviewAt! - expected);
    expect(diff).toBeLessThan(2000); // 2s 窗口
    // 当前时间下, 该记录尚未到期(nextReviewAt 在未来), 所以 dueKanji 不应包含它
    expect(store.dueKanji.some((e) => e.id === quiz.entry.id)).toBe(false);
    // 模拟时钟前进 2 天, 该记录到期后应出现在 dueKanji 中
    // 由于 dueKanji 是 computed, 我们直接调用 getDueKanji 验证
    const { getDueKanji } = await import('@/services/kanji-srs');
    const dueAfter = getDueKanji(store.entries, progress.entries.reduce((acc, e) => {
      acc[e.key] = e.record;
      return acc;
    }, {} as Record<string, AnswerRecord>), now + 2 * 86_400_000);
    expect(dueAfter.some((e) => e.id === quiz.entry.id)).toBe(true);
  });
});