/**
 * 全局单一音频播放器(四态状态机: idle / loading / playing / error->TTS)。
 * - 切换条目自动停上一条; 音量与倍速读 settings 并实时联动。
 * - 真人音频缺失 -> 回退浏览器 SpeechSynthesis + Toast 提示(AC-09)。
 * - 音频 URL 一律由 services/audio-path.ts 生成, 本 store 不拼路径。
 */
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useSettingsStore } from './settings';
import { useToastStore } from './toast';

export type AudioStatus = 'idle' | 'loading' | 'playing' | 'error';

export interface PlayOptions {
  /** 音频缺失时用于 TTS 朗读的日文文本。 */
  text?: string;
  /** 播放条目标题(移动端 AudioMiniDock 显示)。 */
  label?: string;
}

const TTS_NOTICE = '本题真人音频未生成，暂用浏览器朗读';

export const useAudioStore = defineStore('audio', () => {
  const settings = useSettingsStore();
  const toast = useToastStore();

  const status = ref<AudioStatus>('idle');
  const currentKey = ref<string | null>(null);
  const label = ref('');
  const currentTime = ref(0);
  const duration = ref(0);
  const usingTts = ref(false);

  let el: HTMLAudioElement | null = null;
  let ttsText = '';

  const progress = computed(() => (duration.value > 0 ? currentTime.value / duration.value : 0));

  function isActive(key: string): boolean {
    return currentKey.value === key && (status.value === 'playing' || status.value === 'loading');
  }

  function resetState(): void {
    status.value = 'idle';
    currentKey.value = null;
    currentTime.value = 0;
    duration.value = 0;
    usingTts.value = false;
  }

  function cancelTts(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
  }

  /** 音频不可用时的降级朗读。 */
  function speak(text: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) {
      status.value = 'error';
      toast.danger('这条音频暂时无法播放，且浏览器不支持朗读');
      return;
    }
    cancelTts();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ja-JP';
    utter.rate = settings.playbackRate;
    utter.volume = settings.volume;
    utter.onend = () => resetState();
    utter.onerror = () => {
      status.value = 'error';
    };
    usingTts.value = true;
    status.value = 'playing';
    toast.info(TTS_NOTICE);
    window.speechSynthesis.speak(utter);
  }

  function element(): HTMLAudioElement | null {
    if (typeof Audio === 'undefined') return null;
    if (el) return el;
    el = new Audio();
    el.preload = 'none';
    el.addEventListener('playing', () => {
      status.value = 'playing';
    });
    el.addEventListener('waiting', () => {
      status.value = 'loading';
    });
    el.addEventListener('timeupdate', () => {
      currentTime.value = el?.currentTime ?? 0;
      const d = el?.duration ?? 0;
      duration.value = Number.isFinite(d) ? d : 0;
    });
    el.addEventListener('ended', () => resetState());
    el.addEventListener('error', () => speak(ttsText));
    return el;
  }

  function stop(): void {
    cancelTts();
    if (el) {
      el.pause();
      el.removeAttribute('src');
    }
    resetState();
  }

  function play(key: string, src: string, options: PlayOptions = {}): void {
    const audio = element();
    cancelTts();
    ttsText = options.text ?? '';
    label.value = options.label ?? '';
    currentKey.value = key;
    usingTts.value = false;
    status.value = 'loading';
    if (!audio) {
      speak(ttsText);
      return;
    }
    audio.pause();
    audio.src = src;
    audio.volume = settings.volume;
    audio.playbackRate = settings.playbackRate;
    audio.currentTime = 0;
    void audio.play().catch(() => speak(ttsText));
  }

  function pause(): void {
    if (usingTts.value) {
      stop();
      return;
    }
    el?.pause();
    status.value = 'idle';
  }

  /** 同一条目再点 = 暂停; 不同条目 = 切换播放。 */
  function toggle(key: string, src: string, options: PlayOptions = {}): void {
    if (currentKey.value === key && status.value === 'playing') {
      pause();
      return;
    }
    play(key, src, options);
  }

  /** 逐句定位: 进度条拖动(0~1)。 */
  function seek(ratio: number): void {
    if (!el || duration.value <= 0) return;
    el.currentTime = Math.min(1, Math.max(0, ratio)) * duration.value;
  }

  watch(
    () => settings.volume,
    (v) => {
      if (el) el.volume = v;
    },
  );
  watch(
    () => settings.playbackRate,
    (r) => {
      if (el) el.playbackRate = r;
    },
  );

  return {
    status, currentKey, label, currentTime, duration, usingTts, progress,
    isActive, play, pause, toggle, stop, seek, speak,
  };
});
