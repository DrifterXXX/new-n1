# JLPT N1 综合对策 v2 | JLPT N1 Comprehensive Study Platform v2

日语能力考试 N1 综合备考平台全新改版。单页应用设计，侧边栏导航，支持例句、听解和读解三大模块，集成 TTS 语音朗读。

A fully redesigned comprehensive preparation platform for JLPT N1. Single-page application with sidebar navigation, featuring three core modules — grammar examples, listening comprehension, and reading comprehension — with integrated TTS audio support.

---

## 功能 | Features

- **例句学习 Grammar Examples** — 分类展示 N1 语法例句，支持在线音频播放 / Categorized N1 grammar examples with online audio playback
- **听解训练 Listening Practice** — 听力理解练习 / Listening comprehension exercises
- **读解训练 Reading Practice** — 阅读理解练习（长篇/短篇）/ Reading comprehension (long & short passages)
- **侧边栏导航 Sidebar Navigation** — 单页应用，模块间快速切换 / SPA with instant module switching
- **TTS 音频 TTS Audio** — 使用 Microsoft Edge TTS 自动生成例句音频 / Auto-generated example audio via Microsoft Edge TTS

## 快速启动 | Quick Start

```bash
cd new-n1/public
python3 -m http.server 8080
```

打开 Open `http://localhost:8080`

## 技术栈 | Tech Stack

- 纯前端 Frontend-only: HTML5 + CSS3 + JavaScript
- 数据驱动 Data-driven: JSON 文件存储试题和学习内容 / JSON files for questions and study content
- TTS: `generate_tts.py` 使用 `edge-tts` 免费生成音频 / uses `edge-tts` for free audio generation

## 许可证 | License

MIT
