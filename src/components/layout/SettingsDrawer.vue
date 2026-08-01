<script setup lang="ts">
/**
 * 右侧设置抽屉: 数据备份(AC-05) + 字号(AC-08) + 主题 + 每日目标。
 * 导入失败在此就地显示 danger 文案, 同时由 useSnapshot 弹 Toast。
 */
import { ref } from 'vue';
import AppButton from '@/components/common/AppButton.vue';
import AppIcon from '@/components/common/AppIcon.vue';
import { FONT_SIZE } from '@/constants';
import { useSnapshot } from '@/composables/useSnapshot';
import { useSettingsStore } from '@/stores/settings';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const settings = useSettingsStore();
const { busy, errorText, onExport, onImport } = useSnapshot();
const fileRef = ref<HTMLInputElement | null>(null);

async function pickFile(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) await onImport(file);
  input.value = '';
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="drawer" role="dialog" aria-modal="true" aria-label="设置">
      <div class="drawer__scrim" @click="emit('close')" />
      <section class="drawer__panel">
        <header class="drawer__head">
          <h2 class="drawer__title">设置</h2>
          <button type="button" class="drawer__close" aria-label="关闭设置" @click="emit('close')">
            <AppIcon name="x" :size="20" />
          </button>
        </header>

        <div class="drawer__block">
          <p class="caps">数据备份</p>
          <p class="drawer__hint">记录只存在这台设备。换机或清缓存前先导出一份。</p>
          <div class="drawer__row">
            <AppButton icon="download" :loading="busy" @click="onExport">导出备份</AppButton>
            <AppButton icon="upload" :disabled="busy" @click="fileRef?.click()">导入备份</AppButton>
            <input
              ref="fileRef"
              class="sr-only"
              type="file"
              accept="application/json,.json"
              aria-label="选择备份文件"
              @change="pickFile"
            />
          </div>
          <p v-if="errorText" class="drawer__error">{{ errorText }}</p>
        </div>

        <div class="drawer__block">
          <p class="caps">显示</p>
          <label class="drawer__field">
            <span class="drawer__label">字号 <span class="mono">{{ settings.fontSize }}px</span></span>
            <input
              class="drawer__range"
              type="range"
              :min="FONT_SIZE.min"
              :max="FONT_SIZE.max"
              :step="FONT_SIZE.step"
              :value="settings.fontSize"
              @input="settings.setFontSize(Number(($event.target as HTMLInputElement).value))"
            />
          </label>
          <div class="drawer__segment" role="group" aria-label="主题">
            <button
              type="button"
              class="drawer__seg"
              :class="{ 'is-on': settings.theme === 'light' }"
              @click="settings.setTheme('light')"
            >
              <AppIcon name="sun" :size="16" />浅色
            </button>
            <button
              type="button"
              class="drawer__seg"
              :class="{ 'is-on': settings.theme === 'dark' }"
              @click="settings.setTheme('dark')"
            >
              <AppIcon name="moon" :size="16" />深色
            </button>
          </div>
        </div>

        <div class="drawer__block">
          <p class="caps">学习</p>
          <div class="drawer__field">
            <span class="drawer__label">每日目标</span>
            <div class="drawer__stepper">
              <button
                type="button"
                aria-label="减少每日目标"
                @click="settings.setDailyTarget(settings.dailyTarget - 5)"
              >
                <AppIcon name="chevron-left" :size="16" />
              </button>
              <span class="mono drawer__stepper-value">{{ settings.dailyTarget }} 题</span>
              <button
                type="button"
                aria-label="增加每日目标"
                @click="settings.setDailyTarget(settings.dailyTarget + 5)"
              >
                <AppIcon name="chevron-right" :size="16" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.drawer {
  position: fixed;
  inset: 0;
  z-index: 65;
  display: flex;
  justify-content: flex-end;
}

.drawer__scrim {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.32);
}

.drawer__panel {
  position: relative;
  width: min(360px, 100%);
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: var(--space-5);
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
  box-shadow: var(--elev-overlay);
}

.drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer__title {
  font-size: var(--text-xl);
  font-weight: var(--fw-emphasis);
  color: var(--color-text);
}

.drawer__close {
  display: grid;
  place-items: center;
  min-width: var(--tap-min);
  min-height: var(--tap-min);
  border-radius: var(--radius-sm);
  color: var(--color-text-2);
}

.drawer__close:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}

.drawer__block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.drawer__hint {
  font-size: var(--text-sm);
  line-height: var(--leading-body);
  color: var(--color-text-muted);
}

.drawer__row {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.drawer__error {
  font-size: var(--text-sm);
  color: var(--color-danger-strong);
}

.drawer__field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.drawer__label {
  font-size: var(--text-sm);
  color: var(--color-text-2);
}

.drawer__range {
  width: 168px;
  accent-color: var(--color-primary);
}

.drawer__segment {
  display: flex;
  gap: var(--space-2);
}

.drawer__seg {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 38px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  color: var(--color-text-2);
  font-size: var(--text-sm);
}

.drawer__seg.is-on {
  background: var(--color-primary-soft);
  border-color: transparent;
  color: var(--color-primary);
  font-weight: var(--fw-emphasis);
}

.drawer__stepper {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.drawer__stepper button {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  color: var(--color-text-2);
}

.drawer__stepper button:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}

.drawer__stepper-value {
  min-width: 56px;
  text-align: center;
  font-size: var(--text-sm);
}
</style>
