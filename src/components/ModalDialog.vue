<script setup lang="ts">
import {onMounted, onUnmounted} from 'vue';

const props = withDefaults(
  defineProps<{
    title: string;
    busy?: boolean;
    size?: '' | 'modal-lg';
  }>(),
  {busy: false, size: ''},
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit'): void;
}>();

function close(): void {
  if (!props.busy) {
    emit('close');
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
  }
}

onMounted(() => document.addEventListener('keydown', onKeyDown));
onUnmounted(() => document.removeEventListener('keydown', onKeyDown));
</script>

<template>
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" :class="size" role="document">
      <form class="modal-content" @submit.prevent="emit('submit')">
        <div class="modal-header">
          <h5 class="modal-title">{{ title }}</h5>
          <button type="button" class="btn-close" aria-label="Close" :disabled="busy" @click.prevent="close"></button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div class="modal-footer">
          <slot name="footer" />
        </div>
      </form>
    </div>
  </div>
  <div class="modal-backdrop show"></div>
</template>
