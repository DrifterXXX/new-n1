/**
 * content-service 单测 — 覆盖 ARCHITECTURE §9.1 的 8 条要点。
 * 环境: node(纯 TS 层, 不需要 jsdom)。
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getQuestion,
  getQuestionsByKind,
  loadContent,
  normalizeExample,
  normalizeListening,
  normalizeReading,
  normalizeReadingAnswer,
  resetContentCache,
  stripOptionPrefix,
  type RawReading,
} from './content-service';
import type { ListeningQuestion } from '@/types/domain';

afterEach(() => {
  vi.restoreAllMocks();
});

function rawReading(overrides: Partial<RawReading> = {}): RawReading {
  return {
    type: '内容理解（短文）',
    title: 'テスト',
    content: '本文',
    questions: [
      { question: '問1', options: ['1. あ', '2. い', '3. う', '4. え'], answer: 2 },
    ],
    ...overrides,
  };
}

describe('normalizeReadingAnswer — 1-based -> 0-based', () => {
  it('逐条防「漏 -1 / 重复 -1」回归', () => {
    expect(normalizeReadingAnswer(1, 4)).toBe(0);
    expect(normalizeReadingAnswer(2, 4)).toBe(1);
    expect(normalizeReadingAnswer(3, 4)).toBe(2);
    expect(normalizeReadingAnswer(4, 4)).toBe(3);
  });

  it('越界容错: 钳制入 [0, n-1] 且 console.warn, 不抛', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(normalizeReadingAnswer(0, 4)).toBe(0);
    expect(normalizeReadingAnswer(Number.NaN, 4)).toBe(0);
    expect(normalizeReadingAnswer(5, 4)).toBe(3);
    expect(warn).toHaveBeenCalledTimes(3);
  });
});

describe('normalizeReading', () => {
  it('id 注入即数组下标', () => {
    expect(normalizeReading(rawReading(), 7).id).toBe(7);
    expect(normalizeReading(rawReading(), 0).id).toBe(0);
  });

  it('设问 answer 归一 0-based 且剥掉选项序号前缀', () => {
    const r = normalizeReading(rawReading(), 3);
    expect(r.questions[0]?.answer).toBe(1);
    expect(r.questions[0]?.options).toEqual(['あ', 'い', 'う', 'え']);
  });

  it('統合理解: contentA/contentB 保留, content 为 undefined', () => {
    const r = normalizeReading(
      rawReading({ type: '統合理解', content: undefined, contentA: 'A 文', contentB: 'B 文' }),
      5,
    );
    expect(r.contentA).toBe('A 文');
    expect(r.contentB).toBe('B 文');
    expect(r.content).toBeUndefined();
  });
});

describe('normalizeListening — 0-based 不被二次 -1', () => {
  const base: ListeningQuestion = {
    id: 12,
    type: '課題理解',
    script: '会話',
    question: '何をしますか',
    options: ['1. あ', '2. い', '3. う', '4. え'],
    answer: 0,
    explanation: '解説',
  };

  it('answer 原样透传', () => {
    expect(normalizeListening(base).answer).toBe(0);
    expect(normalizeListening({ ...base, answer: 3 }).answer).toBe(3);
  });

  it('选项前缀剥离, 其余字段保留', () => {
    const q = normalizeListening(base);
    expect(q.options).toEqual(['あ', 'い', 'う', 'え']);
    expect(q.explanation).toBe('解説');
    expect(q.id).toBe(12);
  });

  it('越界钳制并告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(normalizeListening({ ...base, answer: 9 }).answer).toBe(3);
    expect(warn).toHaveBeenCalled();
  });
});

describe('stripOptionPrefix / normalizeExample', () => {
  it('支持多种序号写法', () => {
    expect(stripOptionPrefix('1. あ')).toBe('あ');
    expect(stripOptionPrefix('2、い')).toBe('い');
    expect(stripOptionPrefix('3．う')).toBe('う');
    expect(stripOptionPrefix('本来无前缀')).toBe('本来无前缀');
  });

  it('例文缺字段容错', () => {
    const e = normalizeExample({ id: 1, jp: 'に', cn: '', grammar: '', vocab: '' });
    expect(e.id).toBe(1);
    expect(e.cn).toBe('');
  });
});

describe('loadContent — 真实题库归一', () => {
  it('读解 id 即下标(验证未排序) + answer 0-based + 冻结 + 幂等', async () => {
    resetContentCache();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const bundle = await loadContent();

    expect(bundle.readings.length).toBeGreaterThan(0);
    expect(bundle.readings[0]?.id).toBe(0);
    expect(bundle.readings[bundle.readings.length - 1]?.id).toBe(bundle.readings.length - 1);

    for (const r of bundle.readings) {
      for (const q of r.questions) {
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
      }
    }
    for (const q of bundle.listening) {
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
    }

    expect(Object.isFrozen(bundle)).toBe(true);
    expect(Object.isFrozen(bundle.readings)).toBe(true);

    // 幂等: 二次调用返回同一冻结对象, answer 不再变化
    const first = bundle.readings[0]?.questions[0]?.answer;
    const again = await loadContent();
    expect(again).toBe(bundle);
    expect(again.readings[0]?.questions[0]?.answer).toBe(first);
    warn.mockRestore();
  });

  it('getQuestionsByKind 返回对应数组, 元素结构正确', async () => {
    const bundle = await loadContent();
    expect(getQuestionsByKind(bundle, 'example')).toBe(bundle.examples);
    expect(getQuestionsByKind(bundle, 'listening')).toBe(bundle.listening);
    expect(getQuestionsByKind(bundle, 'reading')).toBe(bundle.readings);
    expect(typeof getQuestionsByKind(bundle, 'reading')[0]?.questions[0]?.answer).toBe('number');
    expect(getQuestionsByKind(bundle, 'example')[0]?.jp.length).toBeGreaterThan(0);
  });

  it('getQuestion 反查: 命中设问 / 越界返回 undefined', async () => {
    const bundle = await loadContent();
    const sub = getQuestion(bundle, 'reading', 3, 1);
    expect(sub).toBe(bundle.readings[3]?.questions[1]);
    expect(getQuestion(bundle, 'reading', 3)).toBe(bundle.readings[3]);
    expect(getQuestion(bundle, 'reading', 9999, 0)).toBeUndefined();
    expect(getQuestion(bundle, 'reading', 0, 999)).toBeUndefined();
    expect(getQuestion(bundle, 'listening', 1)).toBe(bundle.listening.find((q) => q.id === 1));
    expect(getQuestion(bundle, 'listening', -1)).toBeUndefined();
    expect(getQuestion(bundle, 'example', 1)).toBe(bundle.examples.find((e) => e.id === 1));
  });
});
