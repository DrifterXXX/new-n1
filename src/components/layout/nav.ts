/** 导航配置(桌面侧栏分组 + 移动 TabBar), 与 router 的 name 一一对应。 */
import { ROUTE_NAMES } from '@/constants';
import type { IconName } from '@/components/common/icon-registry';

export interface NavItem {
  name: string;
  label: string;
  icon: IconName;
}

export interface NavGroup {
  /** 分组小标签(ALL CAPS), 仅降认知负荷, 不改路由结构。 */
  caption: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    caption: '学习',
    items: [
      { name: ROUTE_NAMES.dashboard, label: '学习台', icon: 'layout-dashboard' },
      { name: ROUTE_NAMES.train, label: '题型训练', icon: 'dumbbell' },
    ],
  },
  {
    caption: '题库',
    items: [
      { name: ROUTE_NAMES.kanji, label: '汉字学习', icon: 'book-open' },
      { name: ROUTE_NAMES.examples, label: '文法词汇', icon: 'layers' },
      { name: ROUTE_NAMES.listening, label: '听解题库', icon: 'headphones' },
      { name: ROUTE_NAMES.reading, label: '读解题库', icon: 'file-text' },
    ],
  },
  {
    caption: '复盘',
    items: [{ name: ROUTE_NAMES.review, label: '错题本', icon: 'rotate-ccw' }],
  },
  {
    caption: '指南',
    items: [{ name: ROUTE_NAMES.strategy, label: '考试策略', icon: 'target' }],
  },
];

/** 移动底部 5 项(第 5 项「更多」打开设置抽屉, 不是路由)。 */
export const TAB_ITEMS: NavItem[] = [
  { name: ROUTE_NAMES.dashboard, label: '学习台', icon: 'layout-dashboard' },
  { name: ROUTE_NAMES.examples, label: '题库', icon: 'book-open' },
  { name: ROUTE_NAMES.train, label: '训练', icon: 'dumbbell' },
  { name: ROUTE_NAMES.review, label: '错题', icon: 'rotate-ccw' },
];
