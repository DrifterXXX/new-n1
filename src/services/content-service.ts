/**
 * 只读题库: 加载 -> 归一化 -> 冻结成 ContentBundle。
 * ARCHITECTURE §9.1 规格实现。纯 TS: 无 Vue / 无 Pinia 依赖, 可被 vitest 直接覆盖。
 *
 * 归一化是一次性的加载期动作(loadContent 内发生一次):
 *  - 读解 answer 源为 1-based -> 统一 -1 转 0-based
 *  - 听解 answer 源即 0-based -> 原样透传(仅越界防御), 严禁二次 -1
 *  - 选项文本剥掉源数据自带的 "1. " 序号前缀(UI 用下标渲染编号, 避免双重编号)
 * 业务层拿到的 answer 永远 0-based, 组件层严禁再 -1(防 Spec §11「answer 基线不一」坑)。
 */
import type {
  ContentBundle,
  ContentKind,
  Example,
  ListeningQuestion,
  Reading,
  ReadingQuestion,
} from '@/types/domain';

/* ---------- 源 JSON 原始结构(未归一, 内部类型) ---------- */

export interface RawReadingQuestion {
  question: string;
  options: string[];
  answer: number; // 1-based
}

export interface RawReading {
  type: string;
  title?: string;
  content?: string;
  contentA?: string;
  contentB?: string;
  questions: RawReadingQuestion[];
}

/** 选项前缀: "1. " / "2、" / "3．" / "4)" 等。 */
const OPTION_PREFIX_RE = /^\s*\d+\s*[.、．)）:：]\s*/;

/** 剥离选项文本自带的序号前缀, 存干净文本(编号由 UI 按下标渲染)。 */
export function stripOptionPrefix(option: string): string {
  return String(option ?? '').replace(OPTION_PREFIX_RE, '').trim();
}

function clampIndex(idx: number, optionCount: number): number {
  const max = Math.max(0, optionCount - 1);
  if (!Number.isFinite(idx)) return 0;
  return Math.min(max, Math.max(0, Math.trunc(idx)));
}

/**
 * 读解 answer 归一: 1-based -> 0-based。
 * 容错(Spec §10「题目数据缺失容错渲染」): NaN / <1 / >optionCount 时钳制到
 * [0, optionCount-1] 并 console.warn, 不抛。
 */
export function normalizeReadingAnswer(rawAnswer: number, optionCount: number): number {
  const zeroBased = Number.isFinite(rawAnswer) ? Math.trunc(rawAnswer) - 1 : Number.NaN;
  const max = Math.max(0, optionCount - 1);
  if (!Number.isFinite(zeroBased) || zeroBased < 0 || zeroBased > max) {
    console.warn(
      `[content-service] 读解 answer 越界: raw=${String(rawAnswer)}, options=${optionCount}, 已钳制`,
    );
    return clampIndex(zeroBased, optionCount);
  }
  return zeroBased;
}

/** 单篇读解归一: 注入 id(=数组下标) + 每设问 answer 归一 0-based。源顺序不可变。 */
export function normalizeReading(raw: RawReading, index: number): Reading {
  const questions: ReadingQuestion[] = (raw.questions ?? []).map((q) => {
    const options = (q?.options ?? []).map(stripOptionPrefix);
    return {
      question: q?.question ?? '',
      options,
      answer: normalizeReadingAnswer(q?.answer as number, options.length),
    };
  });
  return {
    id: index,
    type: raw.type ?? '',
    title: raw.title,
    content: raw.content,
    contentA: raw.contentA,
    contentB: raw.contentB,
    questions,
  };
}

/** 听解归一: answer 已 0-based, 原样透传 + 越界防御(与读解一致的容错姿态)。 */
export function normalizeListening(raw: ListeningQuestion): ListeningQuestion {
  const options = (raw.options ?? []).map(stripOptionPrefix);
  const max = Math.max(0, options.length - 1);
  let answer = raw.answer;
  if (!Number.isFinite(answer) || answer < 0 || answer > max) {
    console.warn(
      `[content-service] 听解 answer 越界: id=${String(raw.id)}, raw=${String(raw.answer)}, 已钳制`,
    );
    answer = clampIndex(answer, options.length);
  }
  return {
    id: raw.id,
    type: raw.type,
    script: raw.script,
    question: raw.question,
    options,
    answer,
    explanation: raw.explanation,
  };
}

/** 例文归一: 无 answer, 仅做字段兜底(缺字段容错渲染)。 */
export function normalizeExample(raw: Example): Example {
  return {
    id: raw.id,
    jp: raw.jp ?? '',
    cn: raw.cn ?? '',
    grammar: raw.grammar ?? '',
    vocab: raw.vocab ?? '',
  };
}

/* ---------- 加载 ---------- */

let cache: ContentBundle | null = null;

/** 仅供单测: 清空模块级缓存。 */
export function resetContentCache(): void {
  cache = null;
}

/**
 * 加载并归一全部题库(动态 import 懒加载, 见 ARCHITECTURE §6.1)。
 * 返回冻结的 ContentBundle; content store 只调用一次并缓存。
 */
export async function loadContent(): Promise<ContentBundle> {
  if (cache) return cache;

  const [exMod, liMod, rdMod] = await Promise.all([
    import('../data/examples.json'),
    import('../data/listening.json'),
    import('../data/readings.json'),
  ]);

  const rawExamples = (exMod as unknown as { default: Example[] }).default ?? [];
  const rawListening = (liMod as unknown as { default: ListeningQuestion[] }).default ?? [];
  const rawReadings = (rdMod as unknown as { default: RawReading[] }).default ?? [];

  const bundle: ContentBundle = {
    examples: rawExamples.map(normalizeExample),
    listening: rawListening.map(normalizeListening),
    // 源顺序不可排序: answers 以下标为键, 排序即错位(Spec §11)
    readings: rawReadings.map(normalizeReading),
  };

  Object.freeze(bundle.examples);
  Object.freeze(bundle.listening);
  Object.freeze(bundle.readings);
  cache = Object.freeze(bundle);
  return cache;
}

/* ---------- 查询 ---------- */

export function getQuestionsByKind(bundle: ContentBundle, kind: 'example'): Example[];
export function getQuestionsByKind(bundle: ContentBundle, kind: 'listening'): ListeningQuestion[];
export function getQuestionsByKind(bundle: ContentBundle, kind: 'reading'): Reading[];
export function getQuestionsByKind(
  bundle: ContentBundle,
  kind: ContentKind,
): Example[] | ListeningQuestion[] | Reading[] {
  if (kind === 'example') return bundle.examples;
  if (kind === 'listening') return bundle.listening;
  return bundle.readings;
}

/**
 * 单题定位(ReviewView 用 answerKey 反查题干): kind + id [+ sub]。
 * reading 传 sub 返回对应设问; 找不到返回 undefined(容错, 不抛)。
 */
export function getQuestion(
  bundle: ContentBundle,
  kind: ContentKind,
  id: number,
  sub?: number | null,
): Example | ListeningQuestion | Reading | ReadingQuestion | undefined {
  if (kind === 'example') return bundle.examples.find((e) => e.id === id);
  if (kind === 'listening') return bundle.listening.find((q) => q.id === id);
  const reading = bundle.readings[id];
  if (!reading) return undefined;
  if (sub == null) return reading;
  return reading.questions[sub];
}
