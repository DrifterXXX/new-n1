<script setup lang="ts">
/** 破坏性操作二次确认(PAGE-SPECS §0.8)。Esc 取消, 打开时焦点落在取消钮。 */
import { nextTick, ref, watch } from 'vue';
import AppButton from './AppButton.vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
  }>(),
  { description: undefined, confirmText: '确认', cancelText: '取消' },
);

const emit = defineEmits<{ (e: 'confirm'): void; (e: 'cancel'): void }>();

const cancelRef = ref<InstanceType<typeof AppButton> | null>(null);

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    await nextTick();
    (cancelRef.value?.$el as HTMLElement | undefined)?.focus();
  },
);

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') emit('cancel');
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <div class="modal__scrim" @click="emit('cancel')" />
      <div class="modal__panel">
        <h2 class="modal__title">{{ title }}</h2>
        <p v-if="description" class="modal__desc">{{ description }}</p>
        <div class="modal__actions">
          <AppButton ref="cancelRef" variant="ghost" @click="emit('cancel')">
            {{ cancelText }}
          </AppButton>
          <AppButton variant="danger" icon="trash-2" @click="emit('confirm')">
            {{ confirmText }}
          </AppButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  padding: var(--space-4);
}

.modal__scrim {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.32);
}

.modal__panel {
  position: relative;
  width: min(420px, 100%);
  padding: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--elev-overlay);
}

.modal__title {
  font-size: var(--text-xl);
  font-weight: var(--fw-emphasis);
  letter-spacing: var(--tracking-tight);
  color: var(--color-text);
}

.modal__desc {
  margin-top: var(--space-2);
  font-size: var(--text-sm);
  line-height: var(--leading-body);
  color: var(--color-text-muted);
}

.modal__actions {
  margin-top: var(--space-6);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>
