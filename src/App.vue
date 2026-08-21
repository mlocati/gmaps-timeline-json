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
        <button type="button" class="btn btn-outline-secondary" title="Options" @click.prevent="showOptions = true">
          ⚙
        </button>
        <a
          class="btn btn-outline-secondary"
          href="https://github.com/mlocati/gmaps-timeline-json"
          target="_blank"
          rel="noopener noreferrer"
          title="View the source code on GitHub"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
            style="width: 1rem; height: auto; vertical-align: -0.125em"
          >
            <path
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
            />
          </svg>
        </a>
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
