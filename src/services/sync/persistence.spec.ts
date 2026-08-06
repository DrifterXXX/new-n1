/**
 * localStorage persistence/migration round-trip test.
 *
 * Tests that a kanji answer record survives serialization → deserialization
 * through the migrate() function, which is the same path used by
 * LocalStorageAdapter.pull().
 *
 * Environment: node (pure TS, no jsdom needed).
 */
import { describe, expect, it } from 'vitest';
import { migrate } from '@/services/sync/migrations';
import { SCHEMA_VERSION, answerKey, type UserState } from '@/types/domain';

describe('kanji answer persistence round-trip', () => {
  it('records a wrong answer, serializes, reloads through migrate, and preserves key/id/chosen/correct/wrongCount', () => {
    // ── 1. Build a UserState with a wrong kanji answer ────────────────────
    const key = answerKey('kanji', 1);
    const original: UserState = {
      schemaVersion: SCHEMA_VERSION,
      answers: {
        [key]: {
          kind: 'kanji',
          id: 1,
          sub: null,
          correct: false,
          chosen: 2,
          meta: {
            type: '汉字',
            title: 'お年寄り',
            note: undefined,
            streak: 0,
            wrongCount: 1,
          },
          at: 1712345678000,
        },
      },
      favorites: {},
      daily: {},
      settings: {
        dailyTarget: 20,
        volume: 0.9,
        theme: 'light',
        fontSize: 16,
        playbackRate: 1,
      },
    };

    // ── 2. Simulate localStorage write: JSON.stringify ────────────────────
    const serialized = JSON.stringify(original);

    // ── 3. Simulate localStorage read: JSON.parse → migrate() ─────────────
    const parsed = JSON.parse(serialized);
    const restored = migrate(parsed);

    // ── 4. Assert the record survived ─────────────────────────────────────
    expect(restored.answers[key]).toBeDefined();
    const record = restored.answers[key]!;

    // Key assertions
    expect(record.kind).toBe('kanji');
    expect(record.id).toBe(1);
    expect(record.sub).toBeNull();

    // Answer assertions
    expect(record.chosen).toBe(2);
    expect(record.correct).toBe(false);

    // Meta assertions
    expect(record.meta.title).toBe('お年寄り');
    expect(record.meta.wrongCount).toBe(1);
    expect(record.meta.streak).toBe(0);

    // Timestamp
    expect(record.at).toBe(1712345678000);
  });

  it('preserves multiple wrong answers for the same kanji (wrongCount accumulates)', () => {
    const key = answerKey('kanji', 42);
    const original: UserState = {
      schemaVersion: SCHEMA_VERSION,
      answers: {
        [key]: {
          kind: 'kanji',
          id: 42,
          sub: null,
          correct: false,
          chosen: 3,
          meta: {
            type: '汉字',
            title: '悪化',
            note: '混淆了あっか和あくか',
            streak: 0,
            wrongCount: 3,
          },
          at: 1712345679000,
        },
      },
      favorites: {},
      daily: {},
      settings: {
        dailyTarget: 20,
        volume: 0.9,
        theme: 'light',
        fontSize: 16,
        playbackRate: 1,
      },
    };

    const serialized = JSON.stringify(original);
    const restored = migrate(JSON.parse(serialized));
    const record = restored.answers[key]!;

    expect(record.kind).toBe('kanji');
    expect(record.id).toBe(42);
    expect(record.chosen).toBe(3);
    expect(record.correct).toBe(false);
    expect(record.meta.wrongCount).toBe(3);
    expect(record.meta.streak).toBe(0);
    expect(record.meta.note).toBe('混淆了あっか和あくか');
  });

  it('survives round-trip with a correct answer (wrongCount=0, streak=1)', () => {
    const key = answerKey('kanji', 7);
    const original: UserState = {
      schemaVersion: SCHEMA_VERSION,
      answers: {
        [key]: {
          kind: 'kanji',
          id: 7,
          sub: null,
          correct: true,
          chosen: 0,
          meta: {
            type: '汉字',
            title: '一致',
            note: undefined,
            streak: 1,
            wrongCount: 0,
          },
          at: 1712345680000,
        },
      },
      favorites: {},
      daily: {},
      settings: {
        dailyTarget: 20,
        volume: 0.9,
        theme: 'light',
        fontSize: 16,
        playbackRate: 1,
      },
    };

    const serialized = JSON.stringify(original);
    const restored = migrate(JSON.parse(serialized));
    const record = restored.answers[key]!;

    expect(record.correct).toBe(true);
    expect(record.chosen).toBe(0);
    expect(record.meta.wrongCount).toBe(0);
    expect(record.meta.streak).toBe(1);
  });

  it('handles null/undefined input gracefully (migrate returns defaults)', () => {
    const restored = migrate(null);
    expect(restored.schemaVersion).toBe(SCHEMA_VERSION);
    expect(restored.answers).toEqual({});
    expect(restored.settings.dailyTarget).toBe(20);
  });

  it('handles partial/malformed input gracefully', () => {
    const restored = migrate({ answers: 'not-an-object' });
    expect(restored.answers).toEqual({});
    expect(restored.schemaVersion).toBe(SCHEMA_VERSION);
  });
});