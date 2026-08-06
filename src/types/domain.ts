/**
 * 领域类型 (唯一真源)
 * 覆盖: 只读题库内容(Example/Listening/Reading) + 用户数据(UserState 及其记录)
 * 依赖方向: 叶子模块, 不 import 任何内部模块。
 */

/** 内容种类, 同时作为 answerKey/favKey 的前缀。 */
export type ContentKind = 'example' | 'listening' | 'reading' | 'kanji';

/* ---------- 只读题库内容 ---------- */

/** 文法词汇例文。 */
export interface Example {
  id: number; // 1 起, 与 /audio/{pad4(id)}.mp3 对应
  jp: string;
  cn: string;
  grammar: string;
  vocab: string;
}

/** 听解题目。answer 为 0-based(数据源即 0-based)。 */
export interface ListeningQuestion {
  id: number; // 1 起, 与 /listening_audio/{pad4(id)}.mp3 对应
  type: string; // 課題理解 / ポイント理解 / 概要理解 / 即時応答
  script: string;
  question?: string;
  options: string[];
  answer: number; // 0-based 正确项下标
  explanation?: string;
}

/** 读解设问。answer 经 content-service 归一为 0-based(源 JSON 为 1-based)。 */
export interface ReadingQuestion {
  question: string;
  options: string[];
  answer: number; // 归一后的 0-based 正确项下标
}

/**
 * 读解文章。源数据无 id, 由 content-service 以数组下标注入。
 * 源数组顺序不可变更(answers 以下标为键)。統合理解使用 contentA/contentB。
 */
export interface Reading {
  id: number; // = 加载时的数组下标; 文件名编号为 id+1
  type: string;
  title?: string;
  content?: string;
  contentA?: string;
  contentB?: string;
  questions: ReadingQuestion[];
}

/** 全部只读内容的聚合(content store 持有)。 */
export interface ContentBundle {
  examples: Example[];
  listening: ListeningQuestion[];
  readings: Reading[];
}

/* ---------- 用户数据(需同步) ---------- */

/**
 * 一条答题记录。
 * key 形如 `${kind}:${id}` 或 `${kind}:${id}:${sub}`(见 answerKey)。
 */
export interface AnswerRecord {
  kind: ContentKind;
  id: number;
  sub: number | null; // 读解为设问下标; 听解/例文为 null
  correct: boolean;
  chosen: number; // 用户所选项下标(0-based)
  // note: 错因备注(错题本 ErrorNote 可编辑, blur 即存)
  // streak: 连续答对次数(AC-03 掌握判定, >=3 不再于复习中推送)
  // wrongCount: 累计答错次数(>0 即进入错题回收池, 直到 streak>=3 掌握为止)
  meta: { type?: string; title?: string; note?: string; streak?: number; wrongCount?: number };
  at: number; // epoch ms
}

/** 一条收藏记录。key 形如 `${kind}:${id}`。 */
export interface FavoriteRecord {
  kind: ContentKind;
  id: number;
  at: number;
}

/** 单日记录: done=完成的题(key 同 answerKey), tasks=每日任务勾选。 */
export interface DailyRecord {
  done: Record<string, boolean>;
  tasks: Record<string, boolean>;
}

/**
 * 用户设置。
 * 对齐 Spec §6.1 Settings(锁定)+ AC-06/AC-08: theme/fontSize/playbackRate 均需持久化。
 * (Phase 2 修正: 补齐 domain.ts 与 Spec §6.1 缺失的三个字段, 详见 ARCHITECTURE §9.3)
 */
export interface UserSettings {
  dailyTarget: number; // 每日目标题数(默认 20)
  volume: number; // 0~1(默认 0.9)
  theme: 'light' | 'dark'; // 主题(默认 light); 由 settings store 写入 <html data-theme>
  fontSize: number; // 根字号 px(默认 16, 建议范围 14~20); 全站生效见 §9.3 advisory
  playbackRate: number; // 听解倍速: 0.75 | 1 | 1.25(默认 1)
}

/**
 * 用户全量状态 = 云同步的唯一单位。
 * schemaVersion 用于将来 migrations 升级。
 */
export interface UserState {
  schemaVersion: number;
  answers: Record<string, AnswerRecord>;
  favorites: Record<string, FavoriteRecord>;
  daily: Record<string, DailyRecord>;
  settings: UserSettings;
}

/** 当前 schema 版本。 */
export const SCHEMA_VERSION = 1;

/** 默认用户状态(pull 失败/首次使用时的回退)。 */
export function createDefaultUserState(): UserState {
  return {
    schemaVersion: SCHEMA_VERSION,
    answers: {},
    favorites: {},
    daily: {},
    settings: { dailyTarget: 20, volume: 0.9, theme: 'light', fontSize: 16, playbackRate: 1 },
  };
}

/* ---------- key 构造(格式与旧版一致, 保证数据兼容) ---------- */

export function answerKey(kind: ContentKind, id: number, sub: number | null = null): string {
  return sub == null ? `${kind}:${id}` : `${kind}:${id}:${sub}`;
}

export function favoriteKey(kind: ContentKind, id: number): string {
  return `${kind}:${id}`;
}
