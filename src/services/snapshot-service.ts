/**
 * 用户数据快照导入/导出 (纯数据函数, 不碰 DOM)。
 * ARCHITECTURE §9.2 规格实现, 落地 AC-05。
 *
 * 数据通道唯一 = SyncAdapter 抽象(AC-07 依赖倒置, 将来换 RemoteAdapter 零改动):
 *   导出 = adapter.pull() -> 包信封 -> JSON.stringify (下载交 UI 层)
 *   导入 = JSON.parse -> 校验 -> adapter.push()  (校验不过绝不 push, 不污染现有数据)
 */
import { SNAPSHOT_APP_ID } from '@/constants';
import { SCHEMA_VERSION, type UserState } from '@/types/domain';
import type { SyncAdapter, SyncResult } from './sync/types';
import { migrate } from './sync/migrations';

/** 导出文件信封(带元信息, 便于将来跨版本兼容判定)。 */
export interface SnapshotEnvelope {
  app: typeof SNAPSHOT_APP_ID;
  schemaVersion: number;
  exportedAt: number;
  state: UserState;
}

export type SnapshotErrorCode = 'INVALID_JSON' | 'SCHEMA_MISMATCH' | 'VERSION_UNSUPPORTED';

/** 结构化校验错误(供 UI toast 分类提示)。 */
export class SnapshotError extends Error {
  readonly code: SnapshotErrorCode;

  constructor(code: SnapshotErrorCode, message: string) {
    super(message);
    this.name = 'SnapshotError';
    this.code = code;
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function numberOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** UserState 形状守卫(运行时校验必需字段/类型)。 */
export function validateUserState(value: unknown): value is UserState {
  if (!isPlainObject(value)) return false;
  if (typeof value.schemaVersion !== 'number') return false;
  if (!isPlainObject(value.answers)) return false;
  if (!isPlainObject(value.favorites)) return false;
  if (!isPlainObject(value.daily)) return false;

  const s = value.settings;
  if (!isPlainObject(s)) return false;
  if (typeof s.dailyTarget !== 'number' || typeof s.volume !== 'number') return false;
  if (s.theme !== 'light' && s.theme !== 'dark') return false;
  if (typeof s.fontSize !== 'number' || typeof s.playbackRate !== 'number') return false;
  return true;
}

/** 导出: pull -> 包信封 -> 序列化。返回 JSON 字符串(下载交 UI 层)。 */
export async function exportSnapshot(adapter: SyncAdapter): Promise<string> {
  const result = await adapter.pull();
  const envelope: SnapshotEnvelope = {
    app: SNAPSHOT_APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    state: result.state,
  };
  return JSON.stringify(envelope, null, 2);
}

/** 建议下载文件名: n1-center-backup-YYYYMMDD-HHmm.json。 */
export function snapshotFilename(now: number = Date.now()): string {
  const d = new Date(now);
  const p = (n: number): string => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  return `${SNAPSHOT_APP_ID}-backup-${date}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}

/**
 * 解析 + 校验导入文本 -> UserState。只解析不写入。
 * 兼容「信封」与「裸 UserState」两种输入(向后兼容手工/旧备份);
 * 信封字段兼容 app|appId 与 schemaVersion|version 两种命名。
 */
export function parseSnapshot(json: string): UserState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    throw new SnapshotError('INVALID_JSON', '文件不是合法 JSON，无法导入');
  }
  if (!isPlainObject(parsed)) {
    throw new SnapshotError('SCHEMA_MISMATCH', '备份结构不正确：顶层不是对象');
  }

  let candidate: unknown;
  let version: number;

  if (isPlainObject(parsed.state)) {
    const app = parsed.app ?? parsed.appId;
    if (app !== SNAPSHOT_APP_ID) {
      throw new SnapshotError('SCHEMA_MISMATCH', '这份备份不属于 N1 备考中心');
    }
    version = numberOr(parsed.schemaVersion ?? parsed.version, SCHEMA_VERSION);
    candidate = parsed.state;
  } else {
    candidate = parsed;
    version = numberOr(parsed.schemaVersion, SCHEMA_VERSION);
  }

  if (version > SCHEMA_VERSION) {
    throw new SnapshotError(
      'VERSION_UNSUPPORTED',
      `备份版本 v${version} 高于当前支持的 v${SCHEMA_VERSION}，请升级应用后再导入`,
    );
  }

  const state: unknown = version < SCHEMA_VERSION ? migrate(candidate) : candidate;
  if (!validateUserState(state)) {
    throw new SnapshotError('SCHEMA_MISMATCH', '备份缺少必要字段（answers / favorites / daily / settings）');
  }
  return state;
}

/** 导入: parseSnapshot -> adapter.push 覆盖 -> 返回 SyncResult。校验失败抛错且不 push。 */
export async function importSnapshot(adapter: SyncAdapter, json: string): Promise<SyncResult> {
  const state = parseSnapshot(json);
  return adapter.push(state);
}
