/**
 * 应用入口: 只做装配(依赖倒置 AC-07)。
 * SyncAdapter 的具体实现在这里注入, 业务层只依赖 services/sync 的抽象。
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { initSync } from './services/sync';
import { createLocalStorageAdapter } from './services/sync/local-storage-adapter';
/**
 * 自托管字体(SPEC §4 / AC-10): 由 @fontsource 提供本地 woff2，构建时打进 dist，
 * 全程不请求 fonts.googleapis.com / fonts.gstatic.com，离线可用。
 * 只引 tokens.css 实际声明的字重 + 本应用实际用到的命名子集(latin / japanese /
 * chinese-simplified)，不引按 unicode-range 切片的默认 css，也不引全量 index.css。
 * 默认 css 会把 CJK 拆成上百个编号子集(dist 943 个 woff2 / 56M)，命名子集把文件数
 * 压到 20 个量级；未覆盖的稀有字形回落系统字体，JLPT N1 常用字集不受影响。
 */
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/noto-sans-jp/latin-400.css';
import '@fontsource/noto-sans-jp/latin-500.css';
import '@fontsource/noto-sans-jp/latin-700.css';
import '@fontsource/noto-sans-jp/japanese-400.css';
import '@fontsource/noto-sans-jp/japanese-500.css';
import '@fontsource/noto-sans-jp/japanese-700.css';
import '@fontsource/noto-sans-sc/latin-400.css';
import '@fontsource/noto-sans-sc/latin-500.css';
import '@fontsource/noto-sans-sc/latin-700.css';
import '@fontsource/noto-sans-sc/chinese-simplified-400.css';
import '@fontsource/noto-sans-sc/chinese-simplified-500.css';
import '@fontsource/noto-sans-sc/chinese-simplified-700.css';
import '@fontsource/noto-serif-jp/latin-400.css';
import '@fontsource/noto-serif-jp/latin-500.css';
import '@fontsource/noto-serif-jp/japanese-400.css';
import '@fontsource/noto-serif-jp/japanese-500.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import './styles/tokens.css';
import './styles/base.css';

async function bootstrap(): Promise<void> {
  await initSync(createLocalStorageAdapter());
  const app = createApp(App);
  /**
   * 应用级兜底: 组件树里没被 App.vue 的 onErrorCaptured 拦下的错误(异步回调、
   * watcher、生命周期钩子)在这里落日志，避免静默失败。本地优先应用不外传，只打控制台。
   */
  app.config.errorHandler = (err, _instance, info) => {
    console.error('[app-error]', err, info);
  };
  app.use(createPinia()).use(router).mount('#app');
}

void bootstrap();
