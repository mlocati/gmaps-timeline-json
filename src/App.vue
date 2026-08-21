<script setup lang="ts">
import TimelineViewer from './components/TimelineViewer.vue';
import {computed, ref, watchEffect} from 'vue';
import {loadTimelineJson, sliceTimelineByDateRange, type Timeline} from './timeline';
import * as z from 'zod';
import DateRangeSelector from './components/DateRangeSelector.vue';
import * as date from './date';
import OptionsDialog from './components/OptionsDialog.vue';
import TimelineHelpDialog from './components/TimelineHelpDialog.vue';

const fileInput = ref<HTMLInputElement | null>(null);

const timeline = ref<Timeline | null>(null);
const selectedTimeRange = ref<date.DateRange>(new date.DateRangeImplementation());
const slicedTimeline = computed<Timeline | null>(() => {
  if (!timeline.value) {
    return null;
  }
  return sliceTimelineByDateRange(timeline.value, selectedTimeRange.value.start, selectedTimeRange.value.end);
});

const loadError = ref<string>('');

const baseWindowTitle = document.title;
const loadedFileName = ref<string>('');
watchEffect(() => {
  document.title = loadedFileName.value === '' ? baseWindowTitle : `${loadedFileName.value} - ${baseWindowTitle}`;
});

const showOptions = ref<boolean>(false);
const showTimelineHelp = ref<boolean>(false);
const timelineViewerKey = ref<number>(0);

function onOptionsSaved(): void {
  showOptions.value = false;
  timelineViewerKey.value++;
}

async function onFileChange(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement;
  if (target !== fileInput.value || !target?.value) {
    return;
  }
  loadError.value = '';
  loadedFileName.value = '';
  try {
    if (target?.files?.length !== 1) {
      return;
    }
    const selectedFile = target.files[0];
    const jsonText = await selectedFile.text();
    target.disabled = true;
    timeline.value = loadTimelineJson(jsonText);
    loadedFileName.value = selectedFile.name;
  } catch (error) {
    if (error instanceof z.ZodError) {
      loadError.value = z.prettifyError(error);
    }
    if (!loadError.value) {
      loadError.value = (error as Error)?.message || error?.toString() || 'Unknown error';
    }
  } finally {
    target.value = '';
    target.disabled = false;
  }
  if (timeline.value) {
    const dataMinDate = date.getDate(timeline.value.minDate);
    const dataMaxDate = date.getDate(timeline.value.maxDate);
    if (selectedTimeRange.value.start > dataMaxDate) {
      selectedTimeRange.value.start = dataMaxDate;
    } else if (selectedTimeRange.value.start < dataMinDate) {
      selectedTimeRange.value.start = dataMinDate;
    }
    if (selectedTimeRange.value.type == date.DateRangeType.Custom) {
      if (selectedTimeRange.value.end > dataMaxDate) {
        selectedTimeRange.value.end = date.getDateEndDateTime(dataMaxDate);
      } else if (selectedTimeRange.value.end < dataMinDate) {
        selectedTimeRange.value.end = date.getDateEndDateTime(dataMinDate);
      }
    }
  }
}
</script>

<template>
  <div id="app">
    <header>
      <input ref="fileInput" type="file" accept=".json" @change="onFileChange" hidden />
      <button type="button" class="btn btn-primary" @click.prevent="fileInput?.click()">Load Timeline JSON</button>
      <button
        type="button"
        class="btn btn-outline-secondary"
        title="How to get the Timeline JSON file"
        @click.prevent="showTimelineHelp = true"
      >
        ?
      </button>
      <aside>
        <DateRangeSelector v-if="timeline" :timeline="timeline" v-model="selectedTimeRange" />
        <button type="button" class="btn btn-secondary" title="Options" @click.prevent="showOptions = true">⚙</button>
      </aside>
    </header>
    <main>
      <div v-if="loadError" class="alert alert-danger" role="alert" style="margin: 1rem">
        Error loading timeline:<br />
        <div style="white-space: pre-wrap">{{ loadError }}</div>
      </div>
      <div v-if="timeline && !slicedTimeline" class="alert alert-warning" role="alert" style="margin: 1rem">
        No data for selected date range
      </div>
      <TimelineViewer
        v-if="slicedTimeline"
        :key="timelineViewerKey"
        :timeline="slicedTimeline"
        :dateRangeType="selectedTimeRange.type"
      />
    </main>
    <OptionsDialog v-if="showOptions" @cancel="showOptions = false" @save="onOptionsSaved" />
    <TimelineHelpDialog v-if="showTimelineHelp" @close="showTimelineHelp = false" />
  </div>
</template>
