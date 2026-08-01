/**
 * 题型训练会话(内存态, 不持久化)。
 * 组池: 混合 / 薄弱优先 / 错题回练 / 专项题库; 作答经 progress.record 落库。
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { ContentKind } from '@/types/domain';
import { useContentStore } from './content';
import { useProgressStore } from './progress';
import { useSettingsStore } from './settings';

export type SessionMode = 'mixed' | 'weak' | 'wrong' | 'listening' | 'reading';

export interface SessionItem {
  kind: Exclude<ContentKind, 'example'>;
  id: number;
  sub: number | null;
  type: string;
  title?: string;
}

export interface SessionQuestion {
  item: SessionItem;
  prompt: string;
  options: string[];
  answer: number;
  explanation?: string;
  script?: string;
  article?: string;
  articleB?: string;
}

function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = arr[i] as T;
    const b = arr[j] as T;
    arr[i] = b;
    arr[j] = a;
  }
  return arr;
}

export const useSessionStore = defineStore('session', () => {
  const content = useContentStore();
  const progress = useProgressStore();
  const settings = useSettingsStore();

  const mode = ref<SessionMode | null>(null);
  const items = ref<SessionItem[]>([]);
  const index = ref(0);
  const chosen = ref<Array<number | null>>([]);
  const finished = ref(false);
  const emptyReason = ref<string | null>(null);

  const active = computed(() => mode.value !== null && items.value.length > 0);
  const size = computed(() => items.value.length);
  const currentItem = computed<SessionItem | null>(() => items.value[index.value] ?? null);
  const currentChoice = computed<number | null>(() => chosen.value[index.value] ?? null);
  const answeredCount = computed(() => chosen.value.filter((c) => c !== null).length);

  function poolAll(): SessionItem[] {
    const list: SessionItem[] = [];
    for (const q of content.listening) {
      list.push({ kind: 'listening', id: q.id, sub: null, type: q.type });
    }
    for (const r of content.readings) {
      r.questions.forEach((_, i) => {
        list.push({ kind: 'reading', id: r.id, sub: i, type: r.type, title: r.title });
      });
    }
    return list;
  }

  /** 薄弱优先: 题型正确率低的排前, 同型内未作答的排前。 */
  function poolWeak(): SessionItem[] {
    const rates = new Map<string, number>();
    for (const kind of ['listening', 'reading'] as const) {
      for (const s of progress.statsByType(kind)) rates.set(s.type, s.rate);
    }
    return shuffle(poolAll()).sort((a, b) => {
      const ra = rates.get(a.type) ?? 45;
      const rb = rates.get(b.type) ?? 45;
      if (ra !== rb) return ra - rb;
      const doneA = progress.get(a.kind, a.id, a.sub) ? 1 : 0;
      const doneB = progress.get(b.kind, b.id, b.sub) ? 1 : 0;
      return doneA - doneB;
    });
  }

  /** 错题回练: 取回收池(已排除掌握题), 回填题型/标题。 */
  function poolWrong(): SessionItem[] {
    const list: SessionItem[] = [];
    for (const { record } of progress.wrongEntries) {
      if (record.kind === 'example') continue;
      if (record.kind === 'listening') {
        const q = content.listeningById(record.id);
        if (q) list.push({ kind: 'listening', id: q.id, sub: null, type: q.type });
        continue;
      }
      const r = content.readingById(record.id);
      if (r && record.sub !== null && r.questions[record.sub]) {
        list.push({ kind: 'reading', id: r.id, sub: record.sub, type: r.type, title: r.title });
      }
    }
    return list;
  }

  function start(next: SessionMode): void {
    const target = settings.dailyTarget;
    let pool: SessionItem[];
    emptyReason.value = null;
    if (next === 'wrong') {
      pool = poolWrong();
      if (pool.length === 0) emptyReason.value = '暂无错题，先去做几组积累';
    } else if (next === 'weak') {
      pool = poolWeak();
    } else if (next === 'listening' || next === 'reading') {
      pool = shuffle(poolAll().filter((i) => i.kind === next));
    } else {
      pool = shuffle(poolAll());
    }
    items.value = pool.slice(0, target);
    chosen.value = items.value.map(() => null);
    index.value = 0;
    finished.value = false;
    mode.value = items.value.length > 0 ? next : null;
  }

  function questionOf(item: SessionItem): SessionQuestion | null {
    if (item.kind === 'listening') {
      const q = content.listeningById(item.id);
      if (!q) return null;
      return {
        item,
        prompt: q.question ?? '内容に合うものを一つ選びなさい。',
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        script: q.script,
      };
    }
    const r = content.readingById(item.id);
    const sub = item.sub ?? 0;
    const q = r?.questions[sub];
    if (!r || !q) return null;
    return {
      item,
      prompt: q.question,
      options: q.options,
      answer: q.answer,
      article: r.content ?? r.contentA,
      articleB: r.contentB,
    };
  }

  const currentQuestion = computed<SessionQuestion | null>(() =>
    currentItem.value ? questionOf(currentItem.value) : null,
  );

  /** 作答: 记录选项并写入进度(选中即锁定)。 */
  function answer(choice: number): void {
    const item = currentItem.value;
    const question = currentQuestion.value;
    if (!item || !question) return;
    if (chosen.value[index.value] !== null && chosen.value[index.value] !== undefined) return;
    chosen.value[index.value] = choice;
    progress.record({
      kind: item.kind,
      id: item.id,
      sub: item.sub,
      chosen: choice,
      correct: choice === question.answer,
      meta: { type: item.type, title: item.title },
    });
  }

  function next(): void {
    if (index.value < items.value.length - 1) index.value += 1;
    else finished.value = true;
  }
  function prev(): void {
    if (index.value > 0) index.value -= 1;
  }
  function quit(): void {
    mode.value = null;
    items.value = [];
    chosen.value = [];
    index.value = 0;
    finished.value = false;
  }

  const summary = computed(() => {
    let correct = 0;
    items.value.forEach((item, i) => {
      const pick = chosen.value[i];
      const q = questionOf(item);
      if (pick !== null && pick !== undefined && q && pick === q.answer) correct += 1;
    });
    const answered = answeredCount.value;
    return {
      correct,
      wrong: answered - correct,
      answered,
      rate: answered === 0 ? 0 : Math.round((correct / answered) * 100),
    };
  });

  return {
    mode, items, index, chosen, finished, emptyReason,
    active, size, currentItem, currentChoice, currentQuestion, answeredCount, summary,
    start, answer, next, prev, quit,
  };
});
