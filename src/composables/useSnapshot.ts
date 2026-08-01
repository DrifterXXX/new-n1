/**
 * 备份导入/导出的 UI 编排(AC-05)。
 * snapshot-service 保持纯净(不碰 DOM), 下载/读文件/水合都在这里。
 */
import { ref, type Ref } from 'vue';
import {
  SnapshotError,
  exportSnapshot,
  importSnapshot,
  snapshotFilename,
} from '@/services/snapshot-service';
import { getSyncAdapter } from '@/services/sync';
import { useToastStore } from '@/stores/toast';
import { useUserStore } from '@/stores/user';

const ERROR_TEXT: Record<SnapshotError['code'], string> = {
  INVALID_JSON: '导入失败：文件不是合法 JSON',
  SCHEMA_MISMATCH: '导入失败：备份结构不符，缺少必要字段',
  VERSION_UNSUPPORTED: '导入失败：备份版本高于当前应用，请先升级',
};

function triggerDownload(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

export function useSnapshot(): {
  busy: Ref<boolean>;
  errorText: Ref<string | null>;
  onExport: () => Promise<void>;
  onImport: (file: File) => Promise<void>;
} {
  const toast = useToastStore();
  const user = useUserStore();
  const busy = ref(false);
  const errorText = ref<string | null>(null);

  async function onExport(): Promise<void> {
    busy.value = true;
    errorText.value = null;
    try {
      await user.flush();
      const json = await exportSnapshot(getSyncAdapter());
      triggerDownload(snapshotFilename(), json);
      toast.success('备份已导出，可放进云盘保存');
    } catch {
      errorText.value = '导出失败：无法读取本地数据';
      toast.danger(errorText.value);
    } finally {
      busy.value = false;
    }
  }

  async function onImport(file: File): Promise<void> {
    busy.value = true;
    errorText.value = null;
    try {
      const text = await readFile(file);
      await importSnapshot(getSyncAdapter(), text);
      // push 成功后必须重新水合, 否则 UI 不刷新
      await user.refresh();
      toast.success('备份已导入，学习记录完整还原');
    } catch (e) {
      errorText.value =
        e instanceof SnapshotError ? ERROR_TEXT[e.code] : '导入失败：文件无法读取';
      toast.danger(errorText.value);
    } finally {
      busy.value = false;
    }
  }

  return { busy, errorText, onExport, onImport };
}
