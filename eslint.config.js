/**
 * ESLint v9 flat config — 兑现 SPEC §10「单文件 ≤300 行(ESLint max-lines 强制)」。
 * 覆盖范围: src 下的 .ts / .vue + 根目录构建配置。dist / node_modules / 题库 JSON 不检。
 */
import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'design-system/**',
      'audio/**',
      'listening_audio/**',
      'option_audio/**',
      'data.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] },
    },
    rules: {
      /** SPEC §10 硬约束: 超 300 行必须拆, 不是建议。 */
      'max-lines': ['error', { max: 300, skipBlankLines: false, skipComments: false }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
      /**
       * 全角空格 U+3000 在本项目是内容而非笔误(日文题干靠它分隔题号与设问),
       * 所以字符串/模板/注释内放行, 代码结构里仍然报错。
       */
      'no-irregular-whitespace': [
        'error',
        { skipStrings: true, skipTemplates: true, skipComments: true, skipRegExps: true },
      ],
      /** 只允许 console.warn / console.error(错误边界与降级提示要留痕), 禁 console.log。 */
      'no-console': ['error', { allow: ['warn', 'error'] }],
      /** 零 emoji 图标是 P0: 顺手挡住带非 BMP 字符的正则/字符串误用。 */
      'vue/multi-word-component-names': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/attributes-order': 'off',
      'vue/require-default-prop': 'off',
    },
  },
  {
    /** SFC 模板里的日文正文同样会出现全角空格, 交给 vue 版规则并放行文本节点。 */
    files: ['**/*.vue'],
    rules: {
      'no-irregular-whitespace': 'off',
      'vue/no-irregular-whitespace': [
        'error',
        {
          skipStrings: true,
          skipTemplates: true,
          skipComments: true,
          skipRegExps: true,
          skipHTMLTextContents: true,
        },
      ],
    },
  },
  {
    /** 构建配置与单测跑在 Node 侧。 */
    files: ['*.config.ts', '*.config.js', 'src/**/*.spec.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    /** scripts/ 下的 Node ESM 工具脚本 (CLI 入口, 非 Vue/TS 源码)。 */
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-console': 'off',
    },
  },
);
