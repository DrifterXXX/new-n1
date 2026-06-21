# JLPT N1 综合对策 v2

日语能力考试 N1 综合备考平台全新改版。单页应用设计，侧边栏导航，支持例句、听解和读解三大模块。

## 功能

- **例句学习** — 分类展示 N1 语法例句，支持在线音频播放
- **听解训练** — 听力理解练习
- **读解训练** — 阅读理解练习（长篇/短篇）
- **侧边栏导航** — 单页应用，模块间快速切换
- **TTS 音频** — 使用 Microsoft Edge TTS 自动生成例句音频

## 快速启动

```bash
cd new-n1/public
python3 -m http.server 8080
```

## 技术栈

- 纯前端：HTML5 + CSS3 + JavaScript
- 数据驱动：JSON 文件存储试题和学习内容
- TTS：`generate_tts.py` 使用 `edge-tts` 免费生成音频

## 许可证

MIT
