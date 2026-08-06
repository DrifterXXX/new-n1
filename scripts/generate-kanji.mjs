/**
 * N1 真题汉字数据生成器
 * 从 N1_真题汉字_1200_提取.txt 解析 term→reading 对,
 * 跳过页眉/页脚/水印/空白行, 归一化空白, 精确去重,
 * 输出版本化 JSON 到 src/data/。
 *
 * 用法: node scripts/generate-kanji.mjs
 * 环境变量:
 *   KANJI_SOURCE_PATH  — 源文件路径 (默认: /Users/ayong/docs/learning/N1_真题汉字_1200_提取.txt)
 * 输出: src/data/kanji-v1.json + src/data/kanji-audit-v1.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const sourcePath = process.env.KANJI_SOURCE_PATH || '/Users/ayong/docs/learning/N1_真题汉字_1200_提取.txt';
const kanjiOut = resolve(projectRoot, 'src/data/kanji-v1.json');
const auditOut = resolve(projectRoot, 'src/data/kanji-audit-v1.json');

// ── 页眉/页码/标题 模式 (page-header) ────────────────────────
// 这些是文档结构元数据, 不是水印
const PAGE_HEADER_PATTERNS = [
  /^本内容由@纳豆日语整理发布$/, // 页眉/页脚
  /^第\d+ 页共\d+ 页$/,          // 页码
  /^快收藏！1200 个N1 真题汉字汇总$/, // 标题
];

// ── 水印/碎片 模式 (watermark) ────────────────────────────────
// 这些是页面角落的纳豆日语水印碎片
const WATERMARK_PATTERNS = [
  /^[纳日豆]+$/,                  // 水印碎片
  /^[纳日豆]日[纳日豆]?$/,        // 水印变体
  /^豆日语$/,                     // 水印
  /^纳豆日$/,                     // 水印
  /^纳豆日语$/,                   // 水印
  /^日语$/,                       // 水印
  /^纳$/,                         // 水印
  /^纳豆$/,                       // 水印
];

/** 判断一行是否为页眉/页码/标题, 返回 category 或 null */
function classifyLine(line) {
  for (const pat of PAGE_HEADER_PATTERNS) {
    if (pat.test(line)) return 'page-header';
  }
  for (const pat of WATERMARK_PATTERNS) {
    if (pat.test(line)) return 'watermark';
  }
  return null;
}

/** 解析 "term→reading" 或 "term←reading" 格式 */
function parseLine(line) {
  // 支持 → 和 ← 两种箭头
  const sep = line.includes('→') ? '→' : line.includes('←') ? '←' : null;
  if (!sep) return null;

  const idx = line.indexOf(sep);
  const term = line.slice(0, idx).trim();
  const reading = line.slice(idx + 1).trim();

  if (!term || !reading) return null;
  return { term, reading };
}

// ── 主流程 ──────────────────────────────────────────────────
const raw = readFileSync(sourcePath, 'utf8');
const lines = raw.split('\n');

// 确定性 provenance: 源文件内容的 SHA-256
const sourceSha256 = createHash('sha256').update(raw, 'utf8').digest('hex');

const rawPairs = [];        // 所有解析出的 {term, reading}
const rejected = [];        // 被拒绝的行及其原因
const rejectionCategories = {};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line) continue; // 空行跳过

  const category = classifyLine(line);
  if (category) {
    rejected.push({
      line: i + 1,
      text: line,
      reason: category === 'page-header' ? 'page header / page number / title' : 'watermark fragment',
      category,
    });
    rejectionCategories[category] = (rejectionCategories[category] || 0) + 1;
    continue;
  }

  const parsed = parseLine(line);
  if (!parsed) {
    rejected.push({
      line: i + 1,
      text: line,
      reason: 'unparseable (no → or ← separator)',
      category: 'unparseable',
    });
    rejectionCategories['unparseable'] = (rejectionCategories['unparseable'] || 0) + 1;
    continue;
  }

  rawPairs.push(parsed);
}

// ── 去重 ────────────────────────────────────────────────────
// 精确去重: 相同 (term, reading) 只保留一条
const seen = new Set();
const uniquePairs = [];
const duplicateRows = []; // 审计: 记录哪些 pair 重复了

for (const pair of rawPairs) {
  const key = `${pair.term}→${pair.reading}`;
  if (seen.has(key)) {
    // 找已有记录
    const existing = duplicateRows.find((d) => d.term === pair.term && d.reading === pair.reading);
    if (existing) {
      existing.count++;
    } else {
      duplicateRows.push({ term: pair.term, reading: pair.reading, count: 2 });
    }
    continue;
  }
  seen.add(key);
  uniquePairs.push(pair);
}

// ── 同词异读 ────────────────────────────────────────────────
const termToReadings = {};
for (const pair of uniquePairs) {
  if (!termToReadings[pair.term]) termToReadings[pair.term] = new Set();
  termToReadings[pair.term].add(pair.reading);
}
const sameTermDifferentReadings = Object.entries(termToReadings)
  .filter(([, readings]) => readings.size > 1)
  .map(([term, readings]) => ({ term, readings: [...readings].sort() }))
  .sort((a, b) => a.term.localeCompare(b.term, 'ja'));

// ── 生成稳定 ID ─────────────────────────────────────────────
// 按 term 排序, 相同 term 按 reading 排序, 保证确定性
uniquePairs.sort((a, b) => {
  const tc = a.term.localeCompare(b.term, 'ja');
  if (tc !== 0) return tc;
  return a.reading.localeCompare(b.reading, 'ja');
});

const entries = uniquePairs.map((pair, i) => ({
  id: `kanji-${String(i + 1).padStart(4, '0')}`,
  term: pair.term,
  reading: pair.reading,
}));

// ── 审计报告 ────────────────────────────────────────────────
const audit = {
  sourceSha256,
  version: 'v1',
  source: 'N1_真题汉字_1200_提取.txt (纳豆日语整理)',
  accepted: entries.length,
  rejected: rejected.length,
  rejectionCategories,
  rejectedRows: rejected,
  duplicates: duplicateRows,
  sameTermDifferentReadings,
};

// ── 写入 ────────────────────────────────────────────────────
writeFileSync(kanjiOut, JSON.stringify(entries, null, 2) + '\n');
writeFileSync(auditOut, JSON.stringify(audit, null, 2) + '\n');

console.log(`[generate-kanji] 完成`);
console.log(`  - 原始行数: ${lines.length}`);
console.log(`  - 解析成功: ${rawPairs.length}`);
console.log(`  - 拒绝(页眉/页码/标题): ${rejectionCategories['page-header'] || 0}`);
console.log(`  - 拒绝(水印碎片): ${rejectionCategories['watermark'] || 0}`);
console.log(`  - 拒绝(不可解析): ${rejectionCategories['unparseable'] || 0}`);
console.log(`  - 拒绝合计: ${rejected.length}`);
console.log(`  - 去重后: ${entries.length}`);
console.log(`  - 重复对: ${duplicateRows.length}`);
console.log(`  - 同词异读: ${sameTermDifferentReadings.length}`);
console.log(`  - sourceSha256: ${sourceSha256}`);
console.log(`  - 输出: ${kanjiOut}`);
console.log(`  - 审计: ${auditOut}`);