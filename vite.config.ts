/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// SPA 构建配置。音频/题库大文件放 public/，构建原样拷贝；引用统一走 import.meta.env.BASE_URL。
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  base: '/',
  test: {
    // content-service / snapshot-service 均为纯 TS 层，node 环境即可，无需 jsdom。
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
