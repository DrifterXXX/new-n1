/**
 * 全局常量 (叶子模块)。
 * 集中管理存储键、分页大小、题型枚举、路由名, 避免魔法字符串散落。
 */

/** localStorage 主键: 与旧版一致, 保证现有用户数据兼容。 */
export const STORE_KEY = 'n1-center-v1';

/** 同步元信息键(revision/syncedAt)。 */
export const SYNC_META_KEY = 'n1-center-v1:meta';

/** 各视图每页条数(沿用旧版)。 */
export const PER_PAGE = {
  examples: 18,
  listening: 8,
  reading: 1,
  review: 8,
  kanji: 20,
} as const;

/** 听解题型。 */
export const LISTENING_TYPES = [
  '課題理解',
  'ポイント理解',
  '概要理解',
  '即時応答',
] as const;

/** 读解题型。 */
export const READING_TYPES = [
  '内容理解（短文）',
  '内容理解（中文）',
  '内容理解（長文）',
  '統合理解',
  '主張理解（長文）',
  '情報検索',
] as const;

/** 路由名(与 views 一一对应)。 */
export const ROUTE_NAMES = {
  dashboard: 'dashboard',
  train: 'train',
  examples: 'examples',
  listening: 'listening',
  reading: 'reading',
  review: 'review',
  strategy: 'strategy',
  kanji: 'kanji',
} as const;

/** 持久化防抖间隔(ms): 突发写入合并后再 push。 */
export const PERSIST_DEBOUNCE_MS = 400;

/** 听解倍速档位(Spec §2/§8, AC-06)。settings.playbackRate 取值域。 */
export const PLAYBACK_RATES = [0.75, 1, 1.25] as const;

/** 字号调节(px)边界与默认(Spec §2 P2, AC-08)。settings.fontSize 取值域。 */
export const FONT_SIZE = { min: 14, max: 20, default: 16, step: 1 } as const;

/** 主题取值(Spec §6.1 Settings, AC-08)。 */
export const THEMES = ['light', 'dark'] as const;

/** 导入/导出快照信封标识(snapshot-service)。 */
export const SNAPSHOT_APP_ID = 'n1-center';
