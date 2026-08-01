/**
 * snapshot-service 单测 — 覆盖 ARCHITECTURE §9.2 的 9 条要点。
 * adapter 用内存 mock 实现(证明数据通道只经 SyncAdapter 抽象)。
 */
import { describe, expect, it, vi } from 'vitest';
import {
  SnapshotError,
  exportSnapshot,
  importSnapshot,
  parseSnapshot,
  snapshotFilename,
  validateUserState,
} from './snapshot-service';
import { SNAPSHOT_APP_ID } from '@/constants';
import { SCHEMA_VERSION, createDefaultUserState, type UserState } from '@/types/domain';
import type { SyncAdapter, SyncResult } from './sync/types';

function sampleState(): UserState {
  const s = createDefaultUserState();
  s.answers['listening:1'] = {
    kind: 'listening',
    id: 1,
    sub: null,
    correct: false,
    chosen: 2,
    meta: { type: '課題理解', note: '听漏了转折' },
    at: 1_700_000_000_000,
  };
  s.favorites['example:5'] = { kind: 'example', id: 5, at: 1_700_000_000_001 };
  s.daily['2026-08-01'] = { done: { 'listening:1': true }, tasks: { warmup: true } };
  s.settings = { dailyTarget: 20, volume: 0.5, theme: 'dark', fontSize: 18, playbackRate: 1.25 };
  return s;
}

function createMockAdapter(state: UserState = sampleState()): {
  adapter: SyncAdapter;
  push: ReturnType<typeof vi.fn>;
} {
  const push = vi.fn(
    async (next: UserState): Promise<SyncResult> => ({ state: next, revision: 7, syncedAt: 42 }),
  );
  const adapter: SyncAdapter = {
    name: 'mock',
    init: async () => undefined,
    pull: async () => ({ state, revision: 6, syncedAt: 41 }),
    push,
    subscribe: () => () => undefined,
    clear: async () => undefined,
  };
  return { adapter, push };
}

describe('exportSnapshot', () => {
  it('信封结构正确, state 深等于 pull 的结果', async () => {
    const state = sampleState();
    const { adapter } = createMockAdapter(state);
    const json = await exportSnapshot(adapter);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(parsed.app).toBe(SNAPSHOT_APP_ID);
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    expect(typeof parsed.exportedAt).toBe('number');
    expect(parsed.state).toEqual(state);
  });

  it('round-trip 无损: export -> parseSnapshot 深等于原 state', async () => {
    const state = sampleState();
    const { adapter } = createMockAdapter(state);
    expect(parseSnapshot(await exportSnapshot(adapter))).toEqual(state);
  });
});

describe('parseSnapshot — 拒绝非法输入', () => {
  it('非法 JSON -> INVALID_JSON', () => {
    try {
      parseSnapshot('{bad');
      expect.unreachable('应抛 SnapshotError');
    } catch (e) {
      expect(e).toBeInstanceOf(SnapshotError);
      expect((e as SnapshotError).code).toBe('INVALID_JSON');
    }
  });

  it('schema 不符 -> SCHEMA_MISMATCH', () => {
    const bad = [
      '{}',
      '[]',
      JSON.stringify({ ...sampleState(), answers: undefined }),
      JSON.stringify({ ...sampleState(), settings: undefined }),
      JSON.stringify({ ...sampleState(), settings: { ...sampleState().settings, theme: 'neon' } }),
      JSON.stringify({ app: 'other-app', schemaVersion: SCHEMA_VERSION, state: sampleState() }),
    ];
    for (const json of bad) {
      expect(() => parseSnapshot(json)).toThrowError(SnapshotError);
      try {
        parseSnapshot(json);
      } catch (e) {
        expect((e as SnapshotError).code).toBe('SCHEMA_MISMATCH');
      }
    }
  });

  it('版本过高 -> VERSION_UNSUPPORTED', () => {
    const json = JSON.stringify({
      app: SNAPSHOT_APP_ID,
      schemaVersion: SCHEMA_VERSION + 1,
      exportedAt: Date.now(),
      state: sampleState(),
    });
    try {
      parseSnapshot(json);
      expect.unreachable('应抛 SnapshotError');
    } catch (e) {
      expect((e as SnapshotError).code).toBe('VERSION_UNSUPPORTED');
    }
  });

  it('兼容裸 UserState(无信封)', () => {
    const state = sampleState();
    expect(parseSnapshot(JSON.stringify(state))).toEqual(state);
  });
});

describe('importSnapshot — 拒绝不污染', () => {
  it('非法 JSON: 抛错且 push 从未被调用', async () => {
    const { adapter, push } = createMockAdapter();
    await expect(importSnapshot(adapter, '{bad')).rejects.toBeInstanceOf(SnapshotError);
    await expect(importSnapshot(adapter, '{}')).rejects.toBeInstanceOf(SnapshotError);
    expect(push).toHaveBeenCalledTimes(0);
  });

  it('合法信封: push 收到正确 state 并返回带新 revision 的 SyncResult', async () => {
    const state = sampleState();
    const { adapter, push } = createMockAdapter();
    const json = JSON.stringify({
      app: SNAPSHOT_APP_ID,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: Date.now(),
      state,
    });
    const result = await importSnapshot(adapter, json);
    expect(push).toHaveBeenCalledTimes(1);
    expect(push.mock.calls[0]?.[0]).toEqual(state);
    expect(result.revision).toBe(7);
    expect(result.state).toEqual(state);
  });
});

describe('validateUserState / snapshotFilename', () => {
  it('形状守卫', () => {
    expect(validateUserState(sampleState())).toBe(true);
    expect(validateUserState(null)).toBe(false);
    expect(validateUserState({ schemaVersion: 1 })).toBe(false);
  });

  it('文件名格式 n1-center-backup-YYYYMMDD-HHmm.json', () => {
    const name = snapshotFilename(new Date(2026, 7, 1, 9, 5).getTime());
    expect(name).toMatch(/^n1-center-backup-\d{8}-\d{4}\.json$/);
    expect(name).toBe('n1-center-backup-20260801-0905.json');
  });
});
