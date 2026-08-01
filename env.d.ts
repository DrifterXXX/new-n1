/// <reference types="vite/client" />

// SFC 模块声明：让 TS 认识 `.vue` 单文件组件的默认导出。
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

// 题库 JSON 静态资源模块声明（resolveJsonModule 提供精确字面量类型，此处为兜底）。
declare module '*.json' {
  const value: unknown;
  export default value;
}
