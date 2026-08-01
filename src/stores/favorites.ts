/** 收藏(key = kind:id, 与旧版一致)。写入 user.state.favorites。 */
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { favoriteKey, type ContentKind, type FavoriteRecord } from '@/types/domain';
import { useUserStore } from './user';

export interface FavoriteEntry {
  key: string;
  record: FavoriteRecord;
}

export const useFavoritesStore = defineStore('favorites', () => {
  const user = useUserStore();

  const all = computed<FavoriteEntry[]>(() =>
    Object.entries(user.state.favorites)
      .map(([key, record]) => ({ key, record }))
      .sort((a, b) => b.record.at - a.record.at),
  );

  const count = computed(() => all.value.length);

  function isFav(kind: ContentKind, id: number): boolean {
    return Boolean(user.state.favorites[favoriteKey(kind, id)]);
  }

  /** 返回切换后的状态: true = 已收藏。 */
  function toggle(kind: ContentKind, id: number): boolean {
    const key = favoriteKey(kind, id);
    if (user.state.favorites[key]) {
      delete user.state.favorites[key];
      return false;
    }
    user.state.favorites[key] = { kind, id, at: Date.now() };
    return true;
  }

  return { all, count, isFav, toggle };
});
