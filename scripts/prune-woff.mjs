// Postbuild: 移除 @fontsource 遗留的 legacy .woff 兜底文件与 css 引用。
// 现代浏览器只拉 woff2，woff 从不下载，但会躺在 dist 里占 ~12M 磁盘。
// 本项目 SPEC 边界明确「不支持 IE」，故可安全只留 woff2。
import { readdirSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = 'dist';

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (extname(p) === '.woff') rmSync(p);
  }
}

function pruneCss(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) pruneCss(p);
    else if (extname(p) === '.css') {
      const css = readFileSync(p, 'utf8').replace(
        /,\s*url\([^)]*\.woff\)\s*format\(["']woff["']\)/g,
        '',
      );
      writeFileSync(p, css);
    }
  }
}

walk(DIST);
pruneCss(DIST);
console.log('[prune-woff] removed legacy .woff files and css references from dist');
