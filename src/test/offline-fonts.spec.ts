/**
 * 离线可用回归单测 — 锁定 SPEC §4「字体自托管」与 AC-10。
 * 只做静态源文件断言, 不需要浏览器环境。
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const indexHtml = readFileSync(resolve(projectRoot, 'index.html'), 'utf8');
const mainTs = readFileSync(resolve(projectRoot, 'src/main.ts'), 'utf8');

const FONT_PACKAGES = [
  '@fontsource/inter',
  '@fontsource/noto-sans-jp',
  '@fontsource/noto-sans-sc',
  '@fontsource/noto-serif-jp',
  '@fontsource/jetbrains-mono',
];

describe('index.html · 不外链任何字体 CDN', () => {
  it('不含 fonts.googleapis.com', () => {
    expect(indexHtml).not.toContain('fonts.googleapis.com');
  });

  it('不含 fonts.gstatic.com', () => {
    expect(indexHtml).not.toContain('fonts.gstatic.com');
  });

  it('不含 preconnect 预连接(预连接只为外链服务)', () => {
    expect(indexHtml).not.toContain('preconnect');
  });

  it('不含任何指向远端的 link/script 资源', () => {
    expect(indexHtml).not.toMatch(/<link[^>]+href="https?:\/\//i);
    expect(indexHtml).not.toMatch(/<script[^>]+src="https?:\/\//i);
  });
});

describe('main.ts · 字体由 @fontsource 本地自托管', () => {
  it.each(FONT_PACKAGES)('引入了 %s 的本地字重样式', (pkg) => {
    expect(mainTs).toContain(`${pkg}/`);
  });

  it('按字重引入而非全量 index.css(控体积)', () => {
    for (const pkg of FONT_PACKAGES) {
      expect(mainTs).not.toContain(`${pkg}/index.css`);
      expect(mainTs).not.toContain(`${pkg}'`);
    }
  });
});
