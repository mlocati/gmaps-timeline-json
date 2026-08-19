<script setup lang="ts">
import ModalDialog from './ModalDialog.vue';
import settingsLocationImage from '@/assets/timeline-help/settings-location.png';
import locationServicesImage from '@/assets/timeline-help/location-services.png';
import timelineImage from '@/assets/timeline-help/timeline.png';
import exportTimelineDataImage from '@/assets/timeline-help/export-timeline-data.png';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const steps: {text: string; image: string}[] = [
  {text: 'Open the device settings, then choose Location', image: settingsLocationImage},
  {text: 'Tap Location services', image: locationServicesImage},
  {text: 'Tap Timeline', image: timelineImage},
  {text: 'Tap Export Timeline data', image: exportTimelineDataImage},
];
</script>

<template>
  <ModalDialog
    title="Getting the Google Maps Timeline JSON data"
    size="modal-lg"
    @close="emit('close')"
    @submit="emit('close')"
  >
    <h6>Android</h6>
    <ol class="ps-3">
      <li v-for="step in steps" :key="step.text" class="mb-3">
        {{ step.text }}<br />
        <img :src="step.image" :alt="step.text" class="border rounded mt-1" style="max-width: 100%; height: auto" />
      </li>
      <li>You'll get a <code>Timeline.json</code> file that you can load in this web app</li>
    </ol>
    <template #footer>
      <button type="button" class="btn btn-secondary" @click.prevent="emit('close')">Close</button>
    </template>
  </ModalDialog>
</template>
