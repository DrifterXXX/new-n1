/**
 * kanji-examples-v1.json 单测 — 验证 AI 生成的例句资产符合规格。
 * 环境: node(纯 TS 层, 不需要 jsdom)。
 * 测试顺序: 先验证 JSON 文件存在且可解析, 再逐条验证内容规范。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(fileURLToPath(import.meta.url), '../../..');
const examplesPath = resolve(projectRoot, 'src/data/kanji-examples-v1.json');
const kanjiPath = resolve(projectRoot, 'src/data/kanji-v1.json');

/** 单条例句条目 */
interface KanjiExampleEntry {
  id: string;
  term: string;
  sentenceJa: string;
  translationZh: string;
}

/** 元数据 */
interface ExamplesMetadata {
  generatedBy: string;
  contentKind: string;
  prompt: string;
  version: string;
}

/** 顶层结构 */
interface ExamplesData {
  metadata: ExamplesMetadata;
  entries: KanjiExampleEntry[];
}

/** 敏感词列表 — 仅含明确需要避免的成人/暴力/政治敏感话题 */
const SENSITIVE_PATTERNS: RegExp[] = [
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

/** 日语字符（假名+汉字+长音）计数，排除标点/空格/英文字母/数字 */
const JP_CHAR_REGEX = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/g;

describe('kanji-examples-v1.json — 例句资产存在且可解析', () => {
  let data: ExamplesData;
  let sourceKanji: { id: string; term: string; reading: string }[];

  it('kanji-examples-v1.json 存在且为合法 JSON', () => {
    const raw = readFileSync(examplesPath, 'utf8');
    expect(() => { data = JSON.parse(raw); }).not.toThrow();
    expect(data).toHaveProperty('metadata');
    expect(data).toHaveProperty('entries');
    expect(Array.isArray(data.entries)).toBe(true);
  });

  it('kanji-v1.json 可加载作为参考', () => {
    const raw = readFileSync(kanjiPath, 'utf8');
    sourceKanji = JSON.parse(raw);
    expect(Array.isArray(sourceKanji)).toBe(true);
    expect(sourceKanji.length).toBe(520);
  });

  describe('元数据', () => {
    it('generatedBy 为 AI', () => {
      expect(data.metadata.generatedBy).toBe('AI');
    });

    it('contentKind 为 original-study-examples', () => {
      expect(data.metadata.contentKind).toBe('original-study-examples');
    });

    it('包含 prompt 字段', () => {
      expect(data.metadata).toHaveProperty('prompt');
      expect(typeof data.metadata.prompt).toBe('string');
      expect(data.metadata.prompt.length).toBeGreaterThan(0);
    });

    it('包含 version 字段', () => {
      expect(data.metadata).toHaveProperty('version');
      expect(typeof data.metadata.version).toBe('string');
      expect(data.metadata.version.length).toBeGreaterThan(0);
    });
  });

  describe('条目完整性 — 与 kanji-v1.json 一致', () => {
    it('条目数量为 520', () => {
      expect(data.entries.length).toBe(520);
    });

    it('所有 source ID 都存在于例句中', () => {
      const sourceIds = new Set(sourceKanji.map((e) => e.id));
      const exampleIds = new Set(data.entries.map((e) => e.id));
      expect(exampleIds.size).toBe(520);
      for (const sid of sourceIds) {
        expect(exampleIds.has(sid)).toBe(true);
      }
    });

    it('所有 source term 都存在于例句中', () => {
      const sourceTerms = new Set(sourceKanji.map((e) => e.term));
      const exampleTerms = new Set(data.entries.map((e) => e.term));
      for (const st of sourceTerms) {
        expect(exampleTerms.has(st)).toBe(true);
      }
    });

    it('id 唯一无重复', () => {
      const ids = data.entries.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('id 格式为 kanji-{4位数字}', () => {
      for (const entry of data.entries) {
        expect(entry.id).toMatch(/^kanji-\d{4}$/);
      }
    });

    it('id 与 source 完全一致（一一对应）', () => {
      const sourceMap = new Map(sourceKanji.map((e) => [e.id, e.term]));
      for (const entry of data.entries) {
        expect(sourceMap.has(entry.id)).toBe(true);
        expect(entry.term).toBe(sourceMap.get(entry.id));
      }
    });
  });

  describe('每条条目结构正确', () => {
    it('每条包含 id, term, sentenceJa, translationZh', () => {
      for (const entry of data.entries) {
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('term');
        expect(entry).toHaveProperty('sentenceJa');
        expect(entry).toHaveProperty('translationZh');
      }
    });

    it('term 非空字符串', () => {
      for (const entry of data.entries) {
        expect(typeof entry.term).toBe('string');
        expect(entry.term.length).toBeGreaterThan(0);
      }
    });

    it('sentenceJa 非空字符串', () => {
      for (const entry of data.entries) {
        expect(typeof entry.sentenceJa).toBe('string');
        expect(entry.sentenceJa.length).toBeGreaterThan(0);
      }
    });

    it('translationZh 非空字符串（中文翻译）', () => {
      for (const entry of data.entries) {
        expect(typeof entry.translationZh).toBe('string');
        expect(entry.translationZh.length).toBeGreaterThan(0);
      }
    });

    it('sentenceJa 包含对应 term 的精确 Unicode', () => {
      for (const entry of data.entries) {
        expect(entry.sentenceJa).toContain(entry.term);
      }
    });
  });

  describe('句子长度规范', () => {
    it('句子长度大致在 12–35 日语字符之间（允许最多 52 条轻微例外）', () => {
      const exceptions: Array<{ id: string; term: string; len: number }> = [];
      for (const entry of data.entries) {
        const jpChars = entry.sentenceJa.match(JP_CHAR_REGEX);
        const len = jpChars ? jpChars.length : 0;
        if (len < 12 || len > 35) {
          exceptions.push({ id: entry.id, term: entry.term, len });
        }
      }
      if (exceptions.length > 52) {
        const detail = exceptions.map((e) => `  ${e.id} (${e.term}): ${e.len} chars`).join('\n');
        expect(exceptions.length, `超出长度范围条目过多:\n${detail}`).toBeLessThanOrEqual(52);
      }
    });
  });

  describe('内容安全 — 无敏感话题', () => {
    it('sentenceJa 不含敏感词', () => {
      const hits: Array<{ id: string; term: string; pattern: RegExp }> = [];
      for (const entry of data.entries) {
        // 排除条目自身的 term（term 是源数据中的 N1 词汇，可能本身含敏感字）
        const jaBody = entry.sentenceJa.split(entry.term).join('');
        for (const pat of SENSITIVE_PATTERNS) {
          if (pat.test(jaBody)) {
            hits.push({ id: entry.id, term: entry.term, pattern: pat });
          }
        }
      }
      if (hits.length > 0) {
        const detail = hits.map((h) => `  ${h.id} (${h.term}): matched /${h.pattern.source}/`).join('\n');
        expect(hits.length, `敏感词命中:\n${detail}`).toBe(0);
      }
    });

    it('translationZh 不含敏感词', () => {
      const hits: Array<{ id: string; term: string; pattern: RegExp }> = [];
      for (const entry of data.entries) {
        for (const pat of SENSITIVE_PATTERNS) {
          if (pat.test(entry.translationZh)) {
            hits.push({ id: entry.id, term: entry.term, pattern: pat });
          }
        }
      }
      if (hits.length > 0) {
        const detail = hits.map((h) => `  ${h.id} (${h.term}): matched /${h.pattern.source}/`).join('\n');
        expect(hits.length, `敏感词命中:\n${detail}`).toBe(0);
      }
    });
  });
});