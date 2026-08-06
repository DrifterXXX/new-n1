/**
 * kanji-examples-v1.json 验证/审计脚本
 * 纯 Node.js 实现，无外部依赖。
 * 用法: node scripts/validate-kanji-examples.mjs
 * 返回码: 0=通过, 1=失败
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const examplesPath = resolve(projectRoot, 'src/data/kanji-examples-v1.json');
const kanjiPath = resolve(projectRoot, 'src/data/kanji-v1.json');

/** 日语字符正则 */
const JP_CHAR_REGEX = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/g;

/** 敏感词列表 */
const SENSITIVE_PATTERNS = [
  /殺[人す害]/, /自殺/, /死体/, /暴力/, /テロ/, /麻薬/, /売春/, /ポルノ/,
  /差別/, /虐待/, /陵辱/, /レイプ/, /強姦/, /猥褻/, /わいせつ/,
  /核兵器/, /原爆/, /戦争/, /内戦/, /クーデター/, /革命/, /独裁/, /弾圧/,
  /拷問/, /処刑/, /死刑/, /奴隷/, /人身売買/, /アダルト/, /セックス/, /性交/,
  /中絶/, /不倫/, /DV/, /いじめ/, /自傷/, /薬物/, /依存症/, /ギャンブル/,
  /犯罪/, /逮捕/, /刑務所/, /懲役/, /冤罪/, /詐欺/, /横領/, /汚職/, /賄賂/,
  /スキャンダル/, /中傷/, /誹謗/, /名誉毀損/, /ストーカー/, /セクハラ/, /パワハラ/,
  /放射能/, /被曝/, /原発/, /事故死/, /災害死/, /餓死/, /孤独死/, /心中/,
  /大量殺人/, /無差別/, /通り魔/, /放火/, /強盗/, /窃盗/, /誘拐/, /監禁/, /拉致/,
  /ハイジャック/, /人質/, /銃/, /武器/, /爆発物/, /爆弾/, /毒物/, /毒薬/,
  /化学兵器/, /生物兵器/, /核実験/, /ミサイル/, /侵略/, /虐殺/, /大虐殺/,
  /民族浄化/, /ジェノサイド/, /難民/, /強制収容/, /強制労働/, /慰安婦/, /靖国/,
  /特攻/, /右翼/, /左翼/, /過激派/, /カルト/, /洗脳/, /呪い/, /幽霊/, /オカルト/,
  /陰謀/, /陰謀論/,
];

/** 审计结果 */
const errors = [];
const warnings = [];

function error(msg) { errors.push(msg); console.error(`  ERROR: ${msg}`); }

// ── 加载数据 ────────────────────────────────────────────────

console.log('\n=== kanji-examples-v1.json 验证 ===\n');

// 1. 检查文件存在
if (!existsSync(examplesPath)) {
  error(`文件不存在: ${examplesPath}`);
  console.error(`\n结果: 失败 (${errors.length} 错误)`);
  process.exit(1);
}
console.log(`[OK] 文件存在: ${examplesPath}`);

// 2. 解析 JSON
let data;
try {
  const raw = readFileSync(examplesPath, 'utf8');
  data = JSON.parse(raw);
} catch (e) {
  error(`JSON 解析失败: ${e.message}`);
  console.error(`\n结果: 失败 (${errors.length} 错误)`);
  process.exit(1);
}
console.log('[OK] JSON 解析成功');

// 3. 检查顶层结构
if (!data.metadata) error('缺少 metadata');
if (!data.entries) error('缺少 entries');
if (!Array.isArray(data.entries)) error('entries 不是数组');
if (errors.length > 0) {
  console.error(`\n结果: 失败 (${errors.length} 错误)`);
  process.exit(1);
}

// ── 元数据验证 ──────────────────────────────────────────────
console.log('\n--- 元数据 ---');
if (data.metadata.generatedBy !== 'AI') error(`generatedBy 应为 "AI"，实际为 "${data.metadata.generatedBy}"`);
else console.log(`[OK] generatedBy: ${data.metadata.generatedBy}`);

if (data.metadata.contentKind !== 'original-study-examples') error(`contentKind 应为 "original-study-examples"，实际为 "${data.metadata.contentKind}"`);
else console.log(`[OK] contentKind: ${data.metadata.contentKind}`);

if (!data.metadata.prompt || typeof data.metadata.prompt !== 'string' || data.metadata.prompt.length === 0) error('prompt 字段缺失或为空');
else console.log(`[OK] prompt: ${data.metadata.prompt.substring(0, 60)}...`);

if (!data.metadata.version || typeof data.metadata.version !== 'string' || data.metadata.version.length === 0) error('version 字段缺失或为空');
else console.log(`[OK] version: ${data.metadata.version}`);

// ── 加载 kanji-v1.json 作为参考 ─────────────────────────────
console.log('\n--- 参考数据 ---');
let sourceKanji;
try {
  sourceKanji = JSON.parse(readFileSync(kanjiPath, 'utf8'));
  console.log(`[OK] kanji-v1.json 已加载: ${sourceKanji.length} 条`);
} catch (e) {
  error(`无法加载 kanji-v1.json: ${e.message}`);
  console.error(`\n结果: 失败 (${errors.length} 错误)`);
  process.exit(1);
}

// ── 条目完整性 ──────────────────────────────────────────────
console.log('\n--- 条目完整性 ---');
const entries = data.entries;

if (entries.length !== 520) error(`条目数量: ${entries.length}，应为 520`);
else console.log(`[OK] 条目数量: ${entries.length}`);

// ID 唯一性
const ids = entries.map(e => e.id);
const uniqueIds = new Set(ids);
if (uniqueIds.size !== ids.length) {
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  error(`ID 重复: ${[...new Set(dupes)].join(', ')}`);
} else console.log('[OK] ID 无重复');

// ID 格式
const badIdFormat = ids.filter(id => !/^kanji-\d{4}$/.test(id));
if (badIdFormat.length > 0) error(`ID 格式错误: ${badIdFormat.join(', ')}`);
else console.log('[OK] ID 格式正确');

// 所有 source ID 都存在
const sourceIds = new Set(sourceKanji.map(e => e.id));
const exampleIds = new Set(ids);
const missingIds = [...sourceIds].filter(sid => !exampleIds.has(sid));
if (missingIds.length > 0) error(`缺少 source ID: ${missingIds.join(', ')}`);
else console.log('[OK] 所有 source ID 都存在');

// 所有 source term 都存在
const sourceTerms = new Set(sourceKanji.map(e => e.term));
const exampleTerms = new Set(entries.map(e => e.term));
const missingTerms = [...sourceTerms].filter(st => !exampleTerms.has(st));
if (missingTerms.length > 0) error(`缺少 source term: ${missingTerms.join(', ')}`);
else console.log('[OK] 所有 source term 都存在');

// id ↔ term 一一对应
const sourceMap = new Map(sourceKanji.map(e => [e.id, e.term]));
let idTermMismatch = 0;
for (const entry of entries) {
  if (!sourceMap.has(entry.id)) continue;
  if (entry.term !== sourceMap.get(entry.id)) {
    error(`ID ${entry.id}: term 不匹配，期望 "${sourceMap.get(entry.id)}"，实际 "${entry.term}"`);
    idTermMismatch++;
  }
}
if (idTermMismatch === 0) console.log('[OK] id ↔ term 一一对应');

// ── 字段结构 ────────────────────────────────────────────────
console.log('\n--- 字段结构 ---');
let missingFields = 0;
let emptyTerm = 0;
let emptySentence = 0;
let emptyTranslation = 0;
let termNotInSentence = 0;

for (const entry of entries) {
  if (!entry.id || !entry.term || !entry.sentenceJa || !entry.translationZh) missingFields++;
  if (typeof entry.term !== 'string' || entry.term.length === 0) emptyTerm++;
  if (typeof entry.sentenceJa !== 'string' || entry.sentenceJa.length === 0) emptySentence++;
  if (typeof entry.translationZh !== 'string' || entry.translationZh.length === 0) emptyTranslation++;
  if (!entry.sentenceJa.includes(entry.term)) termNotInSentence++;
}

if (missingFields > 0) error(`${missingFields} 条缺少必填字段`);
else console.log('[OK] 所有条目包含 id, term, sentenceJa, translationZh');

if (emptyTerm > 0) error(`${emptyTerm} 条 term 为空`);
else console.log('[OK] term 均非空');

if (emptySentence > 0) error(`${emptySentence} 条 sentenceJa 为空`);
else console.log('[OK] sentenceJa 均非空');

if (emptyTranslation > 0) error(`${emptyTranslation} 条 translationZh 为空`);
else console.log('[OK] translationZh 均非空');

if (termNotInSentence > 0) error(`${termNotInSentence} 条 sentenceJa 不包含对应 term`);
else console.log('[OK] 所有 sentenceJa 包含对应 term');

// ── 句子长度 ────────────────────────────────────────────────
console.log('\n--- 句子长度 ---');
const lengthOutliers = [];
for (const entry of entries) {
  const jpChars = entry.sentenceJa.match(JP_CHAR_REGEX);
  const len = jpChars ? jpChars.length : 0;
  if (len < 12 || len > 35) {
    lengthOutliers.push({ id: entry.id, term: entry.term, len, sentence: entry.sentenceJa });
  }
}
if (lengthOutliers.length > 52) {
  error(`${lengthOutliers.length} 条超出 12-35 日语字符范围（允许最多 52 条）`);
  for (const o of lengthOutliers) {
    console.error(`    ${o.id} (${o.term}): ${o.len} chars — "${o.sentence}"`);
  }
} else if (lengthOutliers.length > 0) {
  console.log(`[WARN] ${lengthOutliers.length} 条超出 12-35 范围（在允许的 52 条内）`);
  for (const o of lengthOutliers) {
    console.warn(`    ${o.id} (${o.term}): ${o.len} chars — "${o.sentence}"`);
  }
} else {
  console.log('[OK] 所有句子长度在 12-35 日语字符范围内');
}

// ── 敏感词检查 ──────────────────────────────────────────────
console.log('\n--- 敏感词检查 ---');
let jaHits = 0;
let zhHits = 0;
for (const entry of entries) {
  // 排除条目自身的 term：term 是源数据中的 N1 词汇，可能本身含敏感字
  // （如「差別的」），但句子内容仍是中性的学习材料。只检查句子中
  // 除 term 之外的敏感内容。
  const jaBody = entry.sentenceJa.split(entry.term).join('');
  for (const pat of SENSITIVE_PATTERNS) {
    if (pat.test(jaBody)) {
      error(`sentenceJa 敏感词: ${entry.id} (${entry.term}) — 匹配 /${pat.source}/`);
      jaHits++;
    }
    if (pat.test(entry.translationZh)) {
      error(`translationZh 敏感词: ${entry.id} (${entry.term}) — 匹配 /${pat.source}/`);
      zhHits++;
    }
  }
}
if (jaHits === 0 && zhHits === 0) console.log('[OK] 无敏感词命中');

// ── 汇总 ────────────────────────────────────────────────────
console.log('\n--- 汇总 ---');
console.log(`  总条目: ${entries.length}`);
console.log(`  错误: ${errors.length}`);
console.log(`  警告: ${warnings.length}`);
console.log(`  长度异常: ${lengthOutliers.length} (允许 ≤52)`);

if (errors.length > 0) {
  console.error(`\n结果: 失败 (${errors.length} 错误)`);
  process.exit(1);
} else {
  console.log(`\n结果: 通过 ✓`);
  process.exit(0);
}