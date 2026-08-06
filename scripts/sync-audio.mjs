/**
 * 把根目录的真实音频同步到 public/, 供 Vite 以 /audio、/listening_audio、/option_audio 对外服务。
 * 必须在 build 之前执行(或首次克隆后执行), 否则浏览器请求音频 404 -> 退化 TTS。
 *
 * 关键坑: 不要用软链(public/audio -> ../audio), Vite 的 copyDir 会陷入 ELOOP 死循环。
 * 这里先 rmSync 残留再 cpSync 真实目录, 彻底避开符号链接。
 *
 * 用法: npm run sync:audio
 */
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pairs = ['audio', 'listening_audio', 'option_audio', 'kanji_audio'];
const publicDir = resolve(root, 'public');
mkdirSync(publicDir, { recursive: true });

for (const name of pairs) {
  const src = resolve(root, name);
  const dest = resolve(publicDir, name);
  if (!existsSync(src)) {
    console.warn(`[skip] 源目录缺失, 跳过: ${name} (构建仍可继续, 但该题将退化 TTS)`);
    continue;
  }
  rmSync(dest, { recursive: true, force: true }); // 清掉可能残留的软链/旧副本, 防 ELOOP
  cpSync(src, dest, { recursive: true });
  console.log(`synced ${name} -> public/${name}`);
}
console.log('audio sync done');
