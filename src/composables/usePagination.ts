/** 列表分页(纯 UI 逻辑)。source 变化时页码自动收敛到合法范围。 */
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';

export interface Pagination<T> {
  page: Ref<number>;
  totalPages: ComputedRef<number>;
  pageItems: ComputedRef<T[]>;
  go: (p: number) => void;
  next: () => void;
  prev: () => void;
  first: () => void;
  last: () => void;
}

export function usePagination<T>(
  source: ComputedRef<T[]> | Ref<T[]>,
  perPage: number,
  resetKey?: ComputedRef<unknown> | Ref<unknown>,
): Pagination<T> {
  const page = ref(1);
  const totalPages = computed(() => Math.max(1, Math.ceil(source.value.length / perPage)));
  const pageItems = computed(() =>
    source.value.slice((page.value - 1) * perPage, page.value * perPage),
  );

  function go(p: number): void {
    page.value = Math.min(totalPages.value, Math.max(1, Math.trunc(p)));
  }
  const next = (): void => go(page.value + 1);
  const prev = (): void => go(page.value - 1);
  const first = (): void => go(1);
  const last = (): void => go(totalPages.value);

  if (resetKey) watch(resetKey, () => go(1));
  watch(totalPages, () => go(page.value));

  return { page, totalPages, pageItems, go, next, prev, first, last };
}
