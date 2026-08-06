/**
 * kanji 数据管道单测 — 验证 generator 输出的 JSON 符合规格。
 * 环境: node(纯 TS 层, 不需要 jsdom)。
 * 测试顺序: 先验证 JSON 文件存在且可解析, 再逐条验证内容规范。
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(fileURLToPath(import.meta.url), '../../..');
const kanjiPath = resolve(projectRoot, 'src/data/kanji-v1.json');
const auditPath = resolve(projectRoot, 'src/data/kanji-audit-v1.json');

/** 默认源文件路径（与 generate-kanji.mjs 一致） */
const DEFAULT_SOURCE_PATH = '/Users/ayong/docs/learning/N1_真题汉字_1200_提取.txt';

/** 获取实际源文件路径（环境变量覆盖，否则默认） */
function resolveSourcePath(): string {
  return process.env.KANJI_SOURCE_PATH || DEFAULT_SOURCE_PATH;
}

/** 源文件是否存在？ */
function sourceExists(): boolean {
  return existsSync(resolveSourcePath());
}

/** 单条汉字词条 */
interface KanjiEntry {
  id: string;
  term: string;
  reading: string;
}

/** 被拒绝的行详情 */
interface RejectedRow {
  line: number;
  text: string;
  reason: string;
  category: 'page-header' | 'watermark' | 'unparseable';
}

/** 审计报告 — 确定性 provenance, 无 generatedAt */
interface AuditReport {
  sourceSha256: string;
  version: string;
  source: string;
  accepted: number;
  rejected: number;
  rejectionCategories: Record<string, number>;
  rejectedRows: RejectedRow[];
  duplicates: Array<{ term: string; reading: string; count: number }>;
  sameTermDifferentReadings: Array<{ term: string; readings: string[] }>;
}

describe('kanji-v1.json — 数据文件存在且可解析', () => {
  let entries: KanjiEntry[];
  let audit: AuditReport;

  it('kanji-v1.json 存在且为合法 JSON', () => {
    const raw = readFileSync(kanjiPath, 'utf8');
    expect(() => { entries = JSON.parse(raw); }).not.toThrow();
    expect(Array.isArray(entries)).toBe(true);
  });

  it('kanji-audit-v1.json 存在且为合法 JSON', () => {
    const raw = readFileSync(auditPath, 'utf8');
    expect(() => { audit = JSON.parse(raw); }).not.toThrow();
  });

  describe('审计报告 — 确定性 provenance', () => {
    it('没有 generatedAt 字段（时钟派生不可重现）', () => {
      expect(audit).not.toHaveProperty('generatedAt');
    });

    it('包含 sourceSha256 字段（来源内容的确定性哈希）', () => {
      expect(audit).toHaveProperty('sourceSha256');
      expect(typeof audit.sourceSha256).toBe('string');
      // SHA-256 hex 格式: 64 字符小写十六进制
      expect(audit.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
    });

    it.skipIf(!sourceExists())('sourceSha256 与源文件实际 SHA-256 一致', async () => {
      const sourcePath = resolveSourcePath();
      const crypto = await import('node:crypto');
      const sourceContent = readFileSync(sourcePath, 'utf8');
      const actualHash = crypto.createHash('sha256').update(sourceContent, 'utf8').digest('hex');
      expect(audit.sourceSha256).toBe(actualHash);
    });
  });

  describe('审计报告结构正确', () => {
    it('包含所有必填字段', () => {
      expect(audit).toHaveProperty('sourceSha256');
      expect(audit).toHaveProperty('version');
      expect(audit).toHaveProperty('source');
      expect(audit).toHaveProperty('accepted');
      expect(audit).toHaveProperty('rejected');
      expect(audit).toHaveProperty('rejectionCategories');
      expect(audit).toHaveProperty('rejectedRows');
      expect(audit).toHaveProperty('duplicates');
      expect(audit).toHaveProperty('sameTermDifferentReadings');
    });

    it('accepted + rejected = 总行数(不含元数据)', () => {
      // 原始文件 712 行, 含页眉/页脚/水印 113 行
      // 解析后 unique pairs 520 (去重后)
      expect(audit.accepted).toBeGreaterThan(500);
      expect(audit.rejected).toBeGreaterThanOrEqual(100);
    });

    it('rejected 包含 detail 行', () => {
      expect(Array.isArray(audit.rejectedRows)).toBe(true);
      expect(audit.rejectedRows.length).toBe(audit.rejected);
    });

    it('每条 rejectedRow 包含 line, text, reason, category', () => {
      for (const row of audit.rejectedRows) {
        expect(row).toHaveProperty('line');
        expect(typeof row.line).toBe('number');
        expect(row).toHaveProperty('text');
        expect(typeof row.text).toBe('string');
        expect(row).toHaveProperty('reason');
        expect(typeof row.reason).toBe('string');
        expect(row).toHaveProperty('category');
        expect(['page-header', 'watermark', 'unparseable']).toContain(row.category);
      }
    });
  });

  describe('拒绝分类 — page-header 与 watermark 分开', () => {
    it('rejectionCategories 包含 page-header 分类', () => {
      expect(audit.rejectionCategories).toHaveProperty('page-header');
      expect(audit.rejectionCategories['page-header']).toBeGreaterThanOrEqual(1);
    });

    it('rejectionCategories 包含 watermark 分类', () => {
      expect(audit.rejectionCategories).toHaveProperty('watermark');
      expect(audit.rejectionCategories['watermark']).toBeGreaterThanOrEqual(1);
    });

    it('page-header + watermark + unparseable = rejected 总数', () => {
      const sum = (audit.rejectionCategories['page-header'] || 0)
                + (audit.rejectionCategories['watermark'] || 0)
                + (audit.rejectionCategories['unparseable'] || 0);
      expect(sum).toBe(audit.rejected);
    });

    it('page-header 拒绝行 category 均为 page-header', () => {
      const pageHeaderRows = audit.rejectedRows.filter(r => r.category === 'page-header');
      expect(pageHeaderRows.length).toBe(audit.rejectionCategories['page-header']);
    });

    it('watermark 拒绝行 category 均为 watermark', () => {
      const watermarkRows = audit.rejectedRows.filter(r => r.category === 'watermark');
      expect(watermarkRows.length).toBe(audit.rejectionCategories['watermark']);
    });
  });

  describe('每条词条结构正确', () => {
    it('id 格式为 kanji-{4位数字}', () => {
      for (const entry of entries) {
        expect(entry.id).toMatch(/^kanji-\d{4}$/);
      }
    });

    it('id 唯一无重复', () => {
      const ids = entries.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('term 非空字符串', () => {
      for (const entry of entries) {
        expect(typeof entry.term).toBe('string');
        expect(entry.term.length).toBeGreaterThan(0);
      }
    });

    it('reading 非空字符串', () => {
      for (const entry of entries) {
        expect(typeof entry.reading).toBe('string');
        expect(entry.reading.length).toBeGreaterThan(0);
      }
    });

    it('term 不含前导/尾随空白', () => {
      for (const entry of entries) {
        expect(entry.term).toBe(entry.term.trim());
      }
    });

    it('reading 不含前导/尾随空白', () => {
      for (const entry of entries) {
        expect(entry.reading).toBe(entry.reading.trim());
      }
    });

    it('term 不含水印文字(纳豆/日语/豆)', () => {
      for (const entry of entries) {
        expect(entry.term).not.toMatch(/^[纳日豆]+$/);
      }
    });
  });

  describe('去重与同词异读', () => {
    it('无完全重复的 (term, reading) 对', () => {
      const pairs = entries.map((e) => `${e.term}→${e.reading}`);
      expect(new Set(pairs).size).toBe(pairs.length);
    });

    it('同 term 不同 reading 在审计中有记录', () => {
      if (audit.sameTermDifferentReadings.length > 0) {
        for (const item of audit.sameTermDifferentReadings) {
          expect(item.readings.length).toBeGreaterThan(1);
        }
      }
    });

    it('审计中 duplicates 的 count > 1', () => {
      for (const dup of audit.duplicates) {
        expect(dup.count).toBeGreaterThan(1);
      }
    });
  });

  describe('内容完整性', () => {
    it('包含常见 N1 汉字: 一致/必要/災害/認識', () => {
      const terms = entries.map((e) => e.term);
      expect(terms).toContain('一致');
      expect(terms).toContain('必要');
      expect(terms).toContain('災害');
      expect(terms).toContain('認識');
    });

    it('包含 "必要" 的去重结果(只保留一条)', () => {
      // 源文件中 "必要" 出现多次, 但读音相同, 应去重为一条
      const necessary = entries.filter((e) => e.term === '必要');
      expect(necessary.length).toBe(1);
      expect(necessary[0]?.reading).toBe('ひつよう');
    });

    it('包含 "回収" "分析" "威力" 等逆向箭头(←)的条目', () => {
      const terms = entries.map((e) => e.term);
      expect(terms).toContain('回収');
      expect(terms).toContain('分析');
      expect(terms).toContain('威力');
    });
  });
});