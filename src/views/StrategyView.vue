<script setup lang="ts">
/** 考试策略: 6 张纯阅读卡片, 无音频无答题。要点标记用 primary 小圆点(非 emoji)。 */
import AppIcon from '@/components/common/AppIcon.vue';
import type { IconName } from '@/components/common/icon-registry';

interface StrategyCard {
  icon: IconName;
  title: string;
  points: string[];
}

const CARDS: StrategyCard[] = [
  {
    icon: 'calendar',
    title: '每日节奏',
    points: [
      '固定 45 分钟：听解 15 分 + 读解 20 分 + 例文 10 分。',
      '先做题再看解析，不要边看原文边选。',
      '每天留 5 分钟回收昨天的错题，比多做新题有效。',
    ],
  },
  {
    icon: 'headphones',
    title: '听解',
    points: [
      '課題理解先抓「这个人接下来要做什么」。',
      'ポイント理解在音频前会给设问，抢先圈关键词。',
      '概要理解不要记细节，抓说话人的立场。',
      '即時応答只有一句，练到条件反射为止。',
    ],
  },
  {
    icon: 'file-text',
    title: '读解',
    points: [
      '先读设问再读正文，带着问题找答案。',
      '長文抓首尾段与转折词：しかし・つまり・むしろ。',
      '統合理解对比 A / B 的立场差，别混淆两文观点。',
      '情報検索按条件定位，不要通读全表。',
    ],
  },
  {
    icon: 'book-open',
    title: '文法词汇',
    points: [
      '文法按「接续 + 语气」成组记，不要单背释义。',
      '例文跟读一遍，语感比规则记得牢。',
      '拿不准的直接收藏，考前只过收藏夹。',
    ],
  },
  {
    icon: 'clock',
    title: '考场时间分配',
    points: [
      '言語知識 + 読解 110 分钟：文法词汇 35 分，读解 70 分，涂卡 5 分。',
      '听解 55 分钟一次性播放，不允许回听，先扫选项。',
      '一道题卡超过 90 秒就先标记跳过。',
    ],
  },
  {
    icon: 'flag',
    title: '最后七天',
    points: [
      '停做新题，只回收错题本与收藏夹。',
      '每天固定同一时段模拟听解，让耳朵进入状态。',
      '考前一晚导出一份备份，换设备也不丢记录。',
    ],
  },
];
</script>

<template>
  <div class="view">
    <section class="cards">
      <article v-for="card in CARDS" :key="card.title" class="card strategy">
        <h2 class="strategy__title">
          <AppIcon :name="card.icon" :size="20" />
          {{ card.title }}
        </h2>
        <ul class="strategy__list">
          <li v-for="(point, i) in card.points" :key="i">
            <span class="dot" />
            <span>{{ point }}</span>
          </li>
        </ul>
      </article>
    </section>
  </div>
</template>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
  align-items: start;
}

.strategy {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
}

.strategy__title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xl);
  font-weight: var(--fw-emphasis);
  letter-spacing: var(--tracking-tight);
  color: var(--color-text);
}

.strategy__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  font-size: var(--text-base);
  line-height: var(--leading-body);
  color: var(--color-text-2);
}

.strategy__list li {
  display: flex;
  gap: var(--space-3);
}

.dot {
  flex: none;
  width: 6px;
  height: 6px;
  margin-top: 9px;
  border-radius: var(--radius-pill);
  background: var(--color-primary);
}

@media (max-width: 1200px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .cards {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
