<script setup lang="ts">
/** 全局 Toast 容器(底部居中), 支持「撤销」行动按钮。 */
import { useToastStore } from '@/stores/toast';
import AppIcon from './AppIcon.vue';

const toast = useToastStore();

function runAction(id: number, run: () => void): void {
  run();
  toast.dismiss(id);
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-host" role="status" aria-live="polite">
      <div v-for="item in toast.items" :key="item.id" class="toast" :class="`toast--${item.tone}`">
        <AppIcon
          class="toast__icon"
          :name="item.tone === 'success' ? 'circle-check' : item.tone === 'danger' ? 'circle-x' : 'info'"
          :size="16"
        />
        <span class="toast__text">{{ item.text }}</span>
        <button
          v-if="item.action"
          type="button"
          class="toast__action"
          @click="runAction(item.id, item.action.run)"
        >
          {{ item.action.label }}
        </button>
        <button
          type="button"
          class="toast__close"
          aria-label="关闭提示"
          @click="toast.dismiss(item.id)"
        >
          <AppIcon name="x" :size="16" />
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-host {
  position: fixed;
  left: 50%;
  bottom: calc(var(--space-6) + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: min(560px, calc(100vw - var(--space-8)));
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--elev-overlay);
  color: var(--color-text);
  font-size: var(--text-sm);
}

.toast--success .toast__icon {
  color: var(--color-success);
}
.toast--danger .toast__icon {
  color: var(--color-danger);
}
.toast--info .toast__icon {
  color: var(--color-primary);
}

.toast__text {
  flex: 1;
  line-height: var(--leading-body);
}

.toast__action {
  flex: none;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: var(--text-sm);
  font-weight: var(--fw-emphasis);
}

.toast__close {
  flex: none;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  color: var(--color-text-meta);
}

.toast__close:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}

@media (max-width: 960px) {
  .toast-host {
    bottom: calc(72px + env(safe-area-inset-bottom));
  }
}
</style>
