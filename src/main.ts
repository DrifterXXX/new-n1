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
 * 只引 tokens.css 实际声明的字重，不引全量 index.css，避免体积失控。
 */
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/500.css';
import '@fontsource/noto-sans-jp/700.css';
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/noto-sans-sc/700.css';
import '@fontsource/noto-serif-jp/400.css';
import '@fontsource/noto-serif-jp/500.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './styles/tokens.css';
import './styles/base.css';

async function bootstrap(): Promise<void> {
  await initSync(createLocalStorageAdapter());
  createApp(App).use(createPinia()).use(router).mount('#app');
}

void bootstrap();
