/**
 * kanji-examples-service 单测 — 加载/查找/冻结。
 * 环境: node(纯 TS 层, 不需要 jsdom)。
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  findExampleById,
  findExampleByTerm,
  loadKanjiExamples,
  resetKanjiExamplesCache,
} from './kanji-examples-service';

afterEach(() => {
  resetKanjiExamplesCache();
});

describe('loadKanjiExamples', () => {
  it('加载 520 条并冻结 metadata 和 entries', async () => {
    const data = await loadKanjiExamples();
    expect(data.metadata.generatedBy).toBe('AI');
    expect(data.metadata.contentKind).toBe('original-study-examples');
    expect(data.metadata.version).toBe('v1');
    expect(data.entries.length).toBe(520);
    expect(Object.isFrozen(data.metadata)).toBe(true);
    expect(Object.isFrozen(data.entries)).toBe(true);
    expect(Object.isFrozen(data.entries[0])).toBe(true);
  });

  it('幂等: 二次调用返回同一对象', async () => {
    const a = await loadKanjiExamples();
    const b = await loadKanjiExamples();
    expect(b).toBe(a);
  });

  it('每条包含 id/term/sentenceJa/translationZh', async () => {
    const data = await loadKanjiExamples();
    for (const entry of data.entries) {
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('term');
      expect(entry).toHaveProperty('sentenceJa');
      expect(entry).toHaveProperty('translationZh');
      expect(typeof entry.id).toBe('string');
      expect(typeof entry.term).toBe('string');
      expect(typeof entry.sentenceJa).toBe('string');
      expect(typeof entry.translationZh).toBe('string');
      expect(entry.term.length).toBeGreaterThan(0);
      expect(entry.sentenceJa.length).toBeGreaterThan(0);
      expect(entry.translationZh.length).toBeGreaterThan(0);
    }
  });

  it('id 格式为 kanji-{4位数字}', async () => {
    const data = await loadKanjiExamples();
    for (const entry of data.entries) {
      expect(entry.id).toMatch(/^kanji-\d{4}$/);
    }
  });
});

describe('findExampleById', () => {
  it('按 id 找到对应条目', async () => {
    const data = await loadKanjiExamples();
    const entry = findExampleById(data, 'kanji-0001');
    expect(entry).toBeDefined();
    expect(entry!.id).toBe('kanji-0001');
    expect(entry!.term).toBe('お年寄り');
    expect(entry!.sentenceJa.length).toBeGreaterThan(0);
    expect(entry!.translationZh.length).toBeGreaterThan(0);
  });

  it('不存在的 id 返回 undefined', async () => {
    const data = await loadKanjiExamples();
    const entry = findExampleById(data, 'kanji-9999');
    expect(entry).toBeUndefined();
  });

  it('空字符串 id 返回 undefined', async () => {
    const data = await loadKanjiExamples();
    const entry = findExampleById(data, '');
    expect(entry).toBeUndefined();
  });
});

describe('findExampleByTerm', () => {
  it('按 term 找到对应条目', async () => {
    const data = await loadKanjiExamples();
    const entry = findExampleByTerm(data, 'お年寄り');
    expect(entry).toBeDefined();
    expect(entry!.id).toBe('kanji-0001');
  });

  it('不存在的 term 返回 undefined', async () => {
    const data = await loadKanjiExamples();
    const entry = findExampleByTerm(data, 'nonexistent_term_xyz');
    expect(entry).toBeUndefined();
  });
});