/** 路由表: 7 视图 + 根重定向。视图按需加载, 首屏只装学习台。 */
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { ROUTE_NAMES } from '@/constants';
import DashboardView from '@/views/DashboardView.vue';

declare module 'vue-router' {
  interface RouteMeta {
    /** 顶栏主标题。 */
    title: string;
    /** 顶栏副标题(移动端隐藏)。 */
    subtitle: string;
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: { name: ROUTE_NAMES.dashboard } },
  {
    path: '/dashboard',
    name: ROUTE_NAMES.dashboard,
    component: DashboardView,
    meta: { title: '学习台', subtitle: '今天要做什么，打开就能看见' },
  },
  {
    path: '/train',
    name: ROUTE_NAMES.train,
    component: () => import('@/views/TrainView.vue'),
    meta: { title: '题型训练', subtitle: '键盘 1–4 选项，Enter 下一题' },
  },
  {
    path: '/kanji',
    name: ROUTE_NAMES.kanji,
    component: () => import('@/views/KanjiView.vue'),
    meta: { title: '汉字学习', subtitle: '520 个 N1 汉字，搜索/卡片/选择题' },
  },
  {
    path: '/examples',
    name: ROUTE_NAMES.examples,
    component: () => import('@/views/ExamplesView.vue'),
    meta: { title: '文法词汇', subtitle: '200 条例文，搜日文中文文法词汇' },
  },
  {
    path: '/listening',
    name: ROUTE_NAMES.listening,
    component: () => import('@/views/ListeningView.vue'),
    meta: { title: '听解题库', subtitle: '先盲听再看原文，倍速可切 0.75–1.25' },
  },
  {
    path: '/reading',
    name: ROUTE_NAMES.reading,
    component: () => import('@/views/ReadingView.vue'),
    meta: { title: '读解题库', subtitle: '每页一篇，先看设问再读正文' },
  },
  {
    path: '/review',
    name: ROUTE_NAMES.review,
    component: () => import('@/views/ReviewView.vue'),
    meta: { title: '错题本', subtitle: '连对 3 次自动移出回收池' },
  },
  {
    path: '/strategy',
    name: ROUTE_NAMES.strategy,
    component: () => import('@/views/StrategyView.vue'),
    meta: { title: '考试策略', subtitle: '节奏、题型打法与最后七天' },
  },
  { path: '/:pathMatch(.*)*', redirect: { name: ROUTE_NAMES.dashboard } },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

export default router;
