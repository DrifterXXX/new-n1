/**
 * session store 单测 — 重点覆盖 kanji 在 poolWrong / questionOf 中的行为。
 * 需要 jsdom 环境(使用 Pinia)。
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSessionStore } from './session';
import { useContentStore } from './content';
import { useProgressStore } from './progress';
import { useKanjiStore } from './kanji';

describe('useSessionStore — kanji integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('poolWrong 包含 kanji 错题记录', async () => {
    const content = useContentStore();
    await content.load();
    const kanji = useKanjiStore();
    await kanji.load();
    const progress = useProgressStore();
    progress.record({
      kind: 'kanji',
      id: 1,
      chosen: 2,
      correct: false,
      meta: { title: 'お年寄り' },
    });
    const session = useSessionStore();
    session.start('wrong');
    expect(session.items.length).toBeGreaterThan(0);
    const kanjiItems = session.items.filter((i) => i.kind === 'kanji');
    expect(kanjiItems.length).toBeGreaterThan(0);
    expect(kanjiItems[0]!.id).toBe(1);
  });

  it('questionOf 为 kanji id=1 精确生成 お年寄り→おとしより 选择题', async () => {
    const content = useContentStore();
    await content.load();
    const kanji = useKanjiStore();
    await kanji.load();
    const progress = useProgressStore();
    progress.record({
      kind: 'kanji',
      id: 1,
      chosen: 2,
      correct: false,
      meta: { title: 'お年寄り' },
    });
    const session = useSessionStore();
    session.start('wrong');
    const kanjiItem = session.items.find((i) => i.kind === 'kanji');
    expect(kanjiItem).toBeDefined();
    expect(kanjiItem!.id).toBe(1);

    // 直接调用 questionOf 验证
    const q = session.questionOf(kanjiItem!);
    expect(q).not.toBeNull();
    expect(q!.prompt).toBe('お年寄り');
    expect(q!.options[q!.answer]).toBe('おとしより');
    expect(q!.options.length).toBe(4);
    expect(q!.item.kind).toBe('kanji');
    expect(q!.item.id).toBe(1);
  });

  it('questionOf 对不存在的 kanji id 返回 null', async () => {
    const content = useContentStore();
    await content.load();
    const kanji = useKanjiStore();
    await kanji.load();
    const session = useSessionStore();
    const q = session.questionOf({ kind: 'kanji', id: 9999, sub: null, type: '汉字' });
    expect(q).toBeNull();
  });

  it('answer 使用实际选项下标记录到 progress', async () => {
    const content = useContentStore();
    await content.load();
    const kanji = useKanjiStore();
    await kanji.load();
    const progress = useProgressStore();
    progress.record({
      kind: 'kanji',
      id: 1,
      chosen: 2,
      correct: false,
      meta: { title: 'お年寄り' },
    });
    const session = useSessionStore();
    session.start('wrong');

    // 找到 kanji 项并确保它在 index 0
    const idx = session.items.findIndex((i) => i.kind === 'kanji');
    expect(idx).toBeGreaterThanOrEqual(0);

    // 如果 kanji 不在 index 0, 通过多次 next 跳转
    for (let i = 0; i < idx; i++) {
      session.next();
    }

    // 验证 currentItem 指向 kanji
    expect(session.currentItem?.kind).toBe('kanji');
    expect(session.currentItem?.id).toBe(1);

    // 获取当前 question 以确认正确选项
    const q = session.currentQuestion;
    expect(q).not.toBeNull();
    expect(q!.prompt).toBe('お年寄り');

    // 模拟用户选择第 0 项
    const chosenIndex = 0;
    session.answer(chosenIndex);

    // 验证 progress 记录
    const record = progress.get('kanji', 1);
    expect(record).toBeDefined();
    expect(record!.chosen).toBe(chosenIndex);
    expect(record!.correct).toBe(chosenIndex === q!.answer);
    expect(record!.meta.title).toBe('お年寄り');
  });
});