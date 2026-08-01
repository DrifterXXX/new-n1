/**
 * UserState schema 迁移。
 * pull() 读到旧数据后经此升级到当前 SCHEMA_VERSION, 并补齐缺省字段。
 * 兼容旧版单文件应用(无 schemaVersion)写入的 n1-center-v1 数据。
 */
import {
  SCHEMA_VERSION,
  createDefaultUserState,
  type UserState,
} from '@/types/domain';

/**
 * 将任意来源的原始对象规范化为当前版本的完整 UserState。
 * 未知/损坏字段回退为默认, 保证业务层拿到的 state 一定结构完整。
 */
export function migrate(raw: unknown): UserState {
  const base = createDefaultUserState();
  if (!raw || typeof raw !== 'object') return base;

  const src = raw as Partial<UserState> & Record<string, unknown>;

  const merged: UserState = {
    schemaVersion: SCHEMA_VERSION,
    answers: isRecord(src.answers) ? (src.answers as UserState['answers']) : base.answers,
    favorites: isRecord(src.favorites) ? (src.favorites as UserState['favorites']) : base.favorites,
    daily: isRecord(src.daily) ? (src.daily as UserState['daily']) : base.daily,
    settings: {
      dailyTarget: numberOr(src.settings?.dailyTarget, base.settings.dailyTarget),
      volume: clamp01(numberOr(src.settings?.volume, base.settings.volume)),
      // 前向默认填充: 旧数据缺失下列字段时回退默认(schemaVersion 保持 1)
      theme: src.settings?.theme === 'dark' ? 'dark' : base.settings.theme,
      fontSize: numberOr(src.settings?.fontSize, base.settings.fontSize),
      playbackRate: numberOr(src.settings?.playbackRate, base.settings.playbackRate),
    },
  };

  // 预留: 将来跨版本升级在此按 src.schemaVersion 分支处理。
  // if ((src.schemaVersion ?? 0) < 2) { ...升级逻辑... }

  return merged;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}
function numberOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
