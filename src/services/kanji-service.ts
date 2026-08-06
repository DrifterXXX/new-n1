/**
 * kanji 只读服务: 动态加载 → 冻结 → 搜索 + 选择题生成。
 * 纯 TS: 无 Vue / 无 Pinia 依赖, 可被 vitest 直接覆盖。
 *
 * answerKey 适配: kanji 的 id 为字符串(如 'kanji-0001'), 而现有 answerKey 签名
 * 为 (kind, id:number, sub)。使用 numericId = parseInt(id.split('-')[1]) 作为
 * answerKey 的 id 参数, 确保与 progress store 兼容。
 */
export interface KanjiEntry {
  id: string;
  term: string;
  reading: string;
}

export interface KanjiQuiz {
  entry: KanjiEntry;
  direction: 'term→reading' | 'reading→term';
  question: string;
  options: string[];
  correctIndex: number;
}

/* ---------- 加载 ---------- */

let cache: readonly KanjiEntry[] | null = null;

/** 仅供单测: 清空模块级缓存。 */
export function resetKanjiCache(): void {
  cache = null;
}

/**
 * 加载 kanji 数据集(动态 import 懒加载)。
 * 返回冻结数组, 幂等。
 */
export async function loadKanji(): Promise<readonly KanjiEntry[]> {
  if (cache) return cache;

  const mod = await import('../data/kanji-v1.json');
  const raw = (mod as unknown as { default: KanjiEntry[] }).default ?? [];
  const frozen = Object.freeze(raw.map((e) => Object.freeze({ ...e })));
  cache = frozen;
  return cache;
}

/* ---------- 搜索 ---------- */

export function searchKanji(
  list: readonly KanjiEntry[],
  keyword: string,
): KanjiEntry[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return [...list];
  return list.filter(
    (e) =>
      e.term.toLowerCase().includes(kw) ||
      e.reading.toLowerCase().includes(kw),
  );
}

/* ---------- 工具: Fisher-Yates 洗牌 ---------- */

/**
 * 原地 Fisher-Yates 洗牌。O(n), 均匀, 确定性形状。
 * 使用 Math.random() 作为随机源, 不依赖 sort 比较器。
 */
function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/* ---------- 选择题生成 ---------- */

/**
 * 为指定条目生成一道 4 选 1 选择题。
 * 方向: term→reading (显示汉字, 选读音) 或 reading→term (显示读音, 选汉字)。
 * 干扰项从同数据集中随机抽取, 保证不与正解重复, 且干扰项之间互不重复。
 * 不足 4 条时降级为可用条数。
 */
export function generateQuizForEntry(
  list: readonly KanjiEntry[],
  entry: KanjiEntry,
  direction: 'term→reading' | 'reading→term',
): KanjiQuiz {
  const question =
    direction === 'term→reading' ? entry.term : entry.reading;
  const correctValue: string =
    direction === 'term→reading' ? entry.reading : entry.term;

  // 收集候选干扰项(排除正解条目)
  const distractors = list.filter((e) => e.id !== entry.id);
  const distractorValues = distractors.map((e) =>
    direction === 'term→reading' ? e.reading : e.term,
  );

  // 去重
  const uniqueDistractors = [...new Set(distractorValues)];

  // 打乱并取最多 3 个
  const shuffled = shuffleInPlace([...uniqueDistractors]);
  const selected = shuffled.slice(0, 3);

  // 组装选项: 正解 + 干扰项, 打乱
  const allOptions = shuffleInPlace([correctValue, ...selected]);
  const correctIndex = allOptions.indexOf(correctValue);

  return {
    entry,
    direction,
    question,
    options: allOptions,
    correctIndex,
  };
}

/**
 * 生成一道随机 4 选 1 选择题。
 * 委托 generateQuizForEntry, 先随机选一个目标条目。
 */
export function generateQuiz(
  list: readonly KanjiEntry[],
  direction: 'term→reading' | 'reading→term',
): KanjiQuiz {
  const total = list.length;
  const idx = Math.floor(Math.random() * total);
  const entry: KanjiEntry = idx < total ? (list[idx] as KanjiEntry) : (list[0] as KanjiEntry);
  return generateQuizForEntry(list, entry, direction);
}

/** 从 kanji ID 字符串提取数字部分, 用于 answerKey 兼容。 */
export function kanjiNumericId(id: string): number {
  const num = parseInt(id.replace('kanji-', ''), 10);
  return Number.isFinite(num) ? num : 0;
}

/** 从列表中按数字 id 查找对应条目(形如 kanji-NNNN)。 */
export function findEntryById(
  list: readonly KanjiEntry[],
  numericId: number,
): KanjiEntry | undefined {
  const target = `kanji-${String(numericId).padStart(4, '0')}`;
  return list.find((e) => e.id === target);
}