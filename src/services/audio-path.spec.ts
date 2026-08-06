/**
 * audio-path 纯函数单测 — 验证所有路径构造函数的 pad4 约定与 BASE_URL 兼容。
 * 环境: node(纯 TS 层, 不需要 jsdom)。
 */
import { describe, expect, it } from 'vitest';
import { exampleAudio, listeningAudio, listeningOptionAudio, readingOptionAudio, kanjiAudio, kanjiExampleAudio, pad4 } from './audio-path';

describe('pad4', () => {
  it('1 -> 0001', () => {
    expect(pad4(1)).toBe('0001');
  });

  it('520 -> 0520', () => {
    expect(pad4(520)).toBe('0520');
  });

  it('0 -> 0000', () => {
    expect(pad4(0)).toBe('0000');
  });
});

describe('exampleAudio', () => {
  it('id=1 -> /audio/0001.mp3', () => {
    expect(exampleAudio(1)).toMatch(/\/audio\/0001\.mp3$/);
  });
});

describe('listeningAudio', () => {
  it('id=1 -> /listening_audio/0001.mp3', () => {
    expect(listeningAudio(1)).toMatch(/\/listening_audio\/0001\.mp3$/);
  });
});

describe('listeningOptionAudio', () => {
  it('id=1, optIdx=0 -> /option_audio/listening/0001_1.mp3', () => {
    expect(listeningOptionAudio(1, 0)).toMatch(/\/option_audio\/listening\/0001_1\.mp3$/);
  });
});

describe('readingOptionAudio', () => {
  it('readingIndex=0, subIdx=0, optIdx=0 -> /option_audio/reading/0001_1_1.mp3', () => {
    expect(readingOptionAudio(0, 0, 0)).toMatch(/\/option_audio\/reading\/0001_1_1\.mp3$/);
  });
});

describe('kanjiAudio', () => {
  it('numericId=1 -> /kanji_audio/0001.mp3', () => {
    const path = kanjiAudio(1);
    expect(path).toMatch(/\/kanji_audio\/0001\.mp3$/);
  });

  it('numericId=520 -> /kanji_audio/0520.mp3', () => {
    const path = kanjiAudio(520);
    expect(path).toMatch(/\/kanji_audio\/0520\.mp3$/);
  });

  it('numericId=0 -> /kanji_audio/0000.mp3 (edge case)', () => {
    const path = kanjiAudio(0);
    expect(path).toMatch(/\/kanji_audio\/0000\.mp3$/);
  });
});

describe('kanjiExampleAudio', () => {
  it('numericId=1 -> /kanji_example_audio/0001.mp3', () => {
    const path = kanjiExampleAudio(1);
    expect(path).toMatch(/\/kanji_example_audio\/0001\.mp3$/);
  });

  it('numericId=520 -> /kanji_example_audio/0520.mp3', () => {
    const path = kanjiExampleAudio(520);
    expect(path).toMatch(/\/kanji_example_audio\/0520\.mp3$/);
  });

  it('numericId=0 -> /kanji_example_audio/0000.mp3 (edge case)', () => {
    const path = kanjiExampleAudio(0);
    expect(path).toMatch(/\/kanji_example_audio\/0000\.mp3$/);
  });
});