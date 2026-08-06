/**
 * kanji 例句音频管道单测 — 验证 generator 生成的 kanji_example_audio 目录结构符合规格。
 * 环境: node(纯 TS 层, 不需要 jsdom)。
 * 测试顺序: 先验证目录存在, 再逐条验证 MP3 文件存在且可读。
 */
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(fileURLToPath(import.meta.url), '../../..');
const exampleAudioDir = resolve(projectRoot, 'kanji_example_audio');
const publicExampleAudioDir = resolve(projectRoot, 'public/kanji_example_audio');

describe('kanji_example_audio — generated MP3 files', () => {
  it('kanji_example_audio/ 目录存在', () => {
    expect(existsSync(exampleAudioDir)).toBe(true);
  });

  it('包含 520 个 MP3 文件 (0001.mp3 ~ 0520.mp3)', () => {
    if (!existsSync(exampleAudioDir)) return;
    let count = 0;
    for (let i = 1; i <= 520; i++) {
      const p = resolve(exampleAudioDir, `${String(i).padStart(4, '0')}.mp3`);
      if (existsSync(p)) count++;
    }
    expect(count).toBe(520);
  });

  it('0001.mp3 是有效 MP3 (非空, 非目录)', () => {
    const p = resolve(exampleAudioDir, '0001.mp3');
    if (!existsSync(p)) return;
    const st = statSync(p);
    expect(st.isFile()).toBe(true);
    expect(st.size).toBeGreaterThan(100); // 至少 100 字节
  });

  it('0520.mp3 是有效 MP3', () => {
    const p = resolve(exampleAudioDir, '0520.mp3');
    if (!existsSync(p)) return;
    const st = statSync(p);
    expect(st.isFile()).toBe(true);
    expect(st.size).toBeGreaterThan(100);
  });
});

describe('public/kanji_example_audio — static copy', () => {
  it('public/kanji_example_audio/ 目录存在', () => {
    expect(existsSync(publicExampleAudioDir)).toBe(true);
  });

  it('包含 520 个 MP3 文件', () => {
    if (!existsSync(publicExampleAudioDir)) return;
    let count = 0;
    for (let i = 1; i <= 520; i++) {
      const p = resolve(publicExampleAudioDir, `${String(i).padStart(4, '0')}.mp3`);
      if (existsSync(p)) count++;
    }
    expect(count).toBe(520);
  });
});