/**
 * kanji-examples 只读服务: 动态加载 AI 生成的学习例句 → 按 id 查找。
 * 纯 TS: 无 Vue / 无 Pinia 依赖, 可被 vitest 直接覆盖。
 *
 * 数据来源: src/data/kanji-examples-v1.json (520 条 AI 原创例句)
 * 与 kanji-v1.json 共享相同的 id 体系 (kanji-0001 ~ kanji-0520)。
 */
export interface KanjiExampleEntry {
  id: string;
  term: string;
  sentenceJa: string;
  translationZh: string;
}

export interface KanjiExamplesMetadata {
  generatedBy: string;
  contentKind: string;
  prompt: string;
  version: string;
}

export interface KanjiExamplesData {
  metadata: KanjiExamplesMetadata;
  entries: readonly KanjiExampleEntry[];
}

/* ---------- 加载 ---------- */

let cache: KanjiExamplesData | null = null;

/** 仅供单测: 清空模块级缓存。 */
export function resetKanjiExamplesCache(): void {
  cache = null;
}

/**
 * 加载 kanji-examples-v1.json (动态 import 懒加载)。
 * 返回冻结数据, 幂等。
 */
export async function loadKanjiExamples(): Promise<KanjiExamplesData> {
  if (cache) return cache;

  const mod = await import('../data/kanji-examples-v1.json');
  const raw = (mod as unknown as { default: KanjiExamplesData }).default ?? (mod as unknown as KanjiExamplesData);
  cache = {
    metadata: Object.freeze({ ...raw.metadata }),
    entries: Object.freeze(raw.entries.map((e) => Object.freeze({ ...e }))),
  };
  return cache;
}

/* ---------- 查找 ---------- */

/**
 * 按 id 查找例句条目 (如 'kanji-0001')。
 * 不存在时返回 undefined, 不抛异常。
 */
export function findExampleById(
  data: KanjiExamplesData,
  id: string,
): KanjiExampleEntry | undefined {
  return data.entries.find((e) => e.id === id);
}

/**
 * 按 term 查找例句条目。
 * 不存在时返回 undefined。
 */
export function findExampleByTerm(
  data: KanjiExamplesData,
  term: string,
): KanjiExampleEntry | undefined {
  return data.entries.find((e) => e.term === term);
}