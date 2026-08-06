# JLPT N1 备考中心

面向个人冲刺 N1 的本地单页备考网站。目标不是做展示页，而是把每天会用到的内容、题型训练、错题回收和复习节奏放在一个稳定入口里。

## 当前内容

- 例文：200 条 N1 文法/词汇例句，带中文释义和本地 MP3 发音
- 听解：200 题，覆盖課題理解、ポイント理解、概要理解、即時応答
- 读解：30 篇，覆盖短文、中文、长文、統合理解、主張理解、情報検索
- 训练：今日任务、快速训练、错题本、考试策略、进度统计
- 本地记录：使用浏览器 `localStorage` 保存答题、错题、收藏和每日进度

## 启动

```bash
cd /Users/ayong/services/new-N1
npm install
npm run dev
```

然后打开终端输出的开发 URL（默认 `http://localhost:5173/`）。

## 设计原则

- 内容优先：打开就是学习台，不做营销式首页。
- 题型优先：导航和训练以 N1 实际题型组织，不只按材料类型堆列表。
- 复盘优先：每次答题都留下记录，错题和收藏能直接回练。
- 低干扰：纯前端、本地运行、无账号、无服务端依赖。

## 技术栈

- Vue 3 + TypeScript + Vite
- Pinia 状态管理
- Vue Router 路由
- 数据源：`src/data/` 下 JSON 文件
- 音频：`audio/*.mp3`
- TTS 生成脚本：`generate_tts.py`

## 汉字数据

`src/data/kanji-v1.json` 和 `src/data/kanji-audit-v1.json` 由生成器脚本产生，已提交到仓库（版本化）。

### 重新生成

```bash
# 设置源文件路径（第三方整理的 N1 真题汉字列表）
export KANJI_SOURCE_PATH=/path/to/N1_真题汉字_1200_提取.txt

# 执行生成
npm run generate:kanji
```

**注意**：源文件 `N1_真题汉字_1200_提取.txt` 是第三方（纳豆日语）整理的编译资料，**不随仓库分发**。首次克隆后如需重新生成，请自行从原始出处获取该文件，并通过 `KANJI_SOURCE_PATH` 环境变量指定路径。

生成的 JSON 是确定性的（不含 `generatedAt` 等时钟派生字段），相同源文件每次生成结果一致。`kanji-audit-v1.json` 中的 `sourceSha256` 字段用于校验源文件完整性。