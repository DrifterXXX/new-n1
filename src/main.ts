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
import './styles/tokens.css';
import './styles/base.css';

async function bootstrap(): Promise<void> {
  await initSync(createLocalStorageAdapter());
  createApp(App).use(createPinia()).use(router).mount('#app');
}

void bootstrap();
