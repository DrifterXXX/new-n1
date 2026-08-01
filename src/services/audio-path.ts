/**
 * 音频路径构造 (纯函数)。
 * 编号规则与旧版单文件应用严格一致, 任何改动都会导致音频 404。
 * 所有路径带 import.meta.env.BASE_URL 前缀以兼容 Vite base 配置。
 */

function base(): string {
  // Vite 注入; 单测环境回退 '/'
  return (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
}

/** 补零到 4 位: 1 -> '0001'。 */
export function pad4(n: number): string {
  return String(n).padStart(4, '0');
}

/** 例文音频: /audio/{pad4(id)}.mp3  (id 为 Example.id, 1 起)。 */
export function exampleAudio(id: number): string {
  return `${base()}audio/${pad4(id)}.mp3`;
}

/** 听解音频: /listening_audio/{pad4(id)}.mp3  (id 为 ListeningQuestion.id, 1 起)。 */
export function listeningAudio(id: number): string {
  return `${base()}listening_audio/${pad4(id)}.mp3`;
}

/** 听解选项音频: /option_audio/listening/{pad4(id)}_{optIdx+1}.mp3。 */
export function listeningOptionAudio(id: number, optIdx: number): string {
  return `${base()}option_audio/listening/${pad4(id)}_${optIdx + 1}.mp3`;
}

/**
 * 读解选项音频: /option_audio/reading/{pad4(readingIndex+1)}_{subIdx+1}_{optIdx+1}.mp3。
 * readingIndex = Reading.id(数组下标); 文件名编号 = 下标 + 1。
 */
export function readingOptionAudio(readingIndex: number, subIdx: number, optIdx: number): string {
  return `${base()}option_audio/reading/${pad4(readingIndex + 1)}_${subIdx + 1}_${optIdx + 1}.mp3`;
}
