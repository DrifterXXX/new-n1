/**
 * audio store 的 seek 回归单测 — 锁定 AC-06「听解逐句定位」。
 * 环境: node(纯 TS 层), 用假的 HTMLAudioElement 替身, 不依赖 jsdom。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAudioStore } from '@/stores/audio';

/** 最小可用的 HTMLAudioElement 替身: 只实现 store 真正会碰的成员。 */
class FakeAudioElement {
  currentTime = 0;
  duration = 10;
  volume = 1;
  playbackRate = 1;
  preload = '';
  src = '';
  private readonly listeners = new Map<string, Array<() => void>>();

  addEventListener(type: string, handler: () => void): void {
    const list = this.listeners.get(type) ?? [];
    list.push(handler);
    this.listeners.set(type, list);
  }

  removeAttribute(): void {}
  pause(): void {}
  play(): Promise<void> {
    return Promise.resolve();
  }

  /** 手动触发 store 注册的监听(替代真实媒体事件)。 */
  emit(type: string): void {
    for (const handler of this.listeners.get(type) ?? []) handler();
  }
}

let el: FakeAudioElement;

beforeEach(() => {
  setActivePinia(createPinia());
  el = new FakeAudioElement();
  vi.stubGlobal(
    'Audio',
    vi.fn(() => el),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** 起播并同步一次 timeupdate, 让 store 拿到 duration。 */
function playing() {
  const audio = useAudioStore();
  audio.play('listening-01', '/audio/listening-01.mp3', { label: '問題1' });
  el.emit('timeupdate');
  return audio;
}

describe('audio store · seek(AC-06 逐句定位)', () => {
  it('起播后能从媒体元素同步出时长', () => {
    const audio = playing();
    expect(audio.duration).toBe(10);
  });

  it('seek(0.5) 定位到时长的一半', () => {
    const audio = playing();
    audio.seek(0.5);
    expect(el.currentTime).toBeCloseTo(5, 5);
  });

  it('seek(0) 回到开头, seek(1) 到结尾', () => {
    const audio = playing();
    audio.seek(1);
    expect(el.currentTime).toBeCloseTo(10, 5);
    audio.seek(0);
    expect(el.currentTime).toBeCloseTo(0, 5);
  });

  it('比例越界时向下钳制到 0', () => {
    const audio = playing();
    audio.seek(-1);
    expect(el.currentTime).toBe(0);
  });

  it('比例越界时向上钳制到时长', () => {
    const audio = playing();
    audio.seek(2);
    expect(el.currentTime).toBeCloseTo(10, 5);
  });

  it('定位后 progress 随 timeupdate 回读为 0~1 之间的比例', () => {
    const audio = playing();
    audio.seek(0.25);
    el.emit('timeupdate');
    expect(audio.progress).toBeCloseTo(0.25, 5);
  });

  it('尚未起播(无媒体元素)时 seek 静默忽略, 不抛错', () => {
    const audio = useAudioStore();
    expect(() => audio.seek(0.5)).not.toThrow();
    expect(el.currentTime).toBe(0);
  });

  it('时长未知(duration=0)时 seek 不改动播放位置', () => {
    el.duration = Number.NaN;
    const audio = playing();
    expect(audio.duration).toBe(0);
    audio.seek(0.5);
    expect(el.currentTime).toBe(0);
  });
});

describe('audio store · resume(暂停态仍可定位后继续)', () => {
  it('暂停后保留当前条目与时间轴 —— dock 据此继续显示', () => {
    const audio = playing();
    audio.pause();
    expect(audio.currentKey).toBe('listening-01');
    expect(audio.duration).toBe(10);
  });

  it('暂停 → 拖动定位 → resume 从定位点续播, 不回到开头', () => {
    const audio = playing();
    audio.pause();
    audio.seek(0.5);
    audio.resume();
    el.emit('playing');
    expect(el.currentTime).toBeCloseTo(5, 5);
    expect(audio.status).toBe('playing');
  });

  it('stop 后已无可续播条目, resume 静默忽略不抛错', () => {
    const audio = playing();
    audio.stop();
    expect(() => audio.resume()).not.toThrow();
    expect(audio.currentKey).toBeNull();
    expect(audio.status).toBe('idle');
  });
});
