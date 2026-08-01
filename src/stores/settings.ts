/**
 * 用户偏好: 主题 / 字号 / 倍速 / 音量 / 每日目标。
 * 全部写入 user.state.settings(经 SyncAdapter 持久化, AC-08)。
 * 副作用: <html data-theme> 切主题; 根字号切字号(tokens 的 --text-* 为 rem, 自动级联全站)。
 */
import { defineStore } from 'pinia';
import { computed, watch } from 'vue';
import { FONT_SIZE, PLAYBACK_RATES } from '@/constants';
import { useUserStore } from './user';

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export const useSettingsStore = defineStore('settings', () => {
  const user = useUserStore();
  const settings = computed(() => user.state.settings);

  const theme = computed(() => settings.value.theme);
  const fontSize = computed(() => settings.value.fontSize);
  const playbackRate = computed(() => settings.value.playbackRate);
  const volume = computed(() => settings.value.volume);
  const dailyTarget = computed(() => settings.value.dailyTarget);
  const muted = computed(() => settings.value.volume <= 0);

  function setTheme(next: 'light' | 'dark'): void {
    user.state.settings.theme = next;
  }
  function toggleTheme(): void {
    setTheme(theme.value === 'dark' ? 'light' : 'dark');
  }
  function setFontSize(px: number): void {
    user.state.settings.fontSize = clamp(Math.round(px), FONT_SIZE.min, FONT_SIZE.max);
  }
  function setPlaybackRate(rate: number): void {
    user.state.settings.playbackRate = PLAYBACK_RATES.find((r) => r === rate) ?? 1;
  }
  /** 倍速循环切换 0.75 -> 1.0 -> 1.25(听解页 gauge 钮)。 */
  function cyclePlaybackRate(): void {
    const current = playbackRate.value as (typeof PLAYBACK_RATES)[number];
    const idx = PLAYBACK_RATES.indexOf(current);
    user.state.settings.playbackRate = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length] ?? 1;
  }
  function setVolume(v: number): void {
    user.state.settings.volume = clamp(Number(v.toFixed(2)), 0, 1);
  }
  function toggleMute(): void {
    setVolume(muted.value ? 0.9 : 0);
  }
  function setDailyTarget(n: number): void {
    user.state.settings.dailyTarget = clamp(Math.round(n), 5, 100);
  }

  /** 把偏好应用到文档根节点。 */
  function apply(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', theme.value);
    root.style.fontSize = clamp(fontSize.value, FONT_SIZE.min, FONT_SIZE.max) + 'px';
  }

  watch([theme, fontSize], apply, { immediate: true });

  return {
    settings,
    theme,
    fontSize,
    playbackRate,
    volume,
    dailyTarget,
    muted,
    setTheme,
    toggleTheme,
    setFontSize,
    setPlaybackRate,
    cyclePlaybackRate,
    setVolume,
    toggleMute,
    setDailyTarget,
    apply,
  };
});
