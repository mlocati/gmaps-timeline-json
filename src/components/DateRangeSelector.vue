<script setup lang="ts">
import {computed} from 'vue';
import type {Timeline} from '../timeline';
import * as date from '../date';

const props = defineProps<{
  timeline: Timeline;
}>();

const selectedTimeRange = defineModel<date.DateRange>({required: true});

const canGoBack = computed<boolean>(() => {
  switch (selectedTimeRange.value.type) {
    case date.DateRangeType.Day:
    case date.DateRangeType.Year:
      return selectedTimeRange.value.start > date.getDate(props.timeline.minDate) ? true : false;
  }
  return false;
});

const canGoForward = computed<boolean>(() => {
  switch (selectedTimeRange.value.type) {
    case date.DateRangeType.Day:
    case date.DateRangeType.Year:
      return selectedTimeRange.value.end < date.getDate(props.timeline.maxDate) ? true : false;
  }
  return false;
});
</script>
<template>
  <div class="input-group input-group-sm">
    <select
      class="form-select form-select-sm"
      style="width: 7rem"
      name="selected-range-type"
      :value="selectedTimeRange.type"
      required
      @change="(e) => (selectedTimeRange.type = (e.target as HTMLSelectElement).value as date.DateRangeType)"
    >
      <option :value="date.DateRangeType.Day">Day</option>
      <option :value="date.DateRangeType.Year">Year</option>
      <option :value="date.DateRangeType.Custom">Custom</option>
    </select>
    <template v-if="selectedTimeRange.type === date.DateRangeType.Day">
      <div class="input-group-text">
        <button
          type="button"
          class="btn btn-sm"
          :class="canGoBack ? 'btn-secondary' : 'btn-outline-secondary'"
          :disabled="!canGoBack"
          @click.prevent="selectedTimeRange.deltaRange(-1)"
        >
          ⇦
        </button>
      </div>
      <input
        type="date"
        style="width: 7rem"
        class="form-control form-control-sm"
        name="selected-day"
        :min="date.dateToIsoString(timeline.minDate)"
        :max="date.dateToIsoString(timeline.maxDate)"
        :value="date.dateToIsoString(selectedTimeRange.start)"
        required
        @input="selectedTimeRange.start = date.isoStringToDate(($event.target as HTMLInputElement).value) || selectedTimeRange.start"
        "
      />
      <div class="input-group-text">
        <button
          type="button"
          class="btn btn-sm"
          :class="canGoForward ? 'btn-secondary' : 'btn-outline-secondary'"
          :disabled="!canGoForward"
          @click.prevent="selectedTimeRange.deltaRange(1)"
        >
          ⇨
        </button>
      </div>
    </template>
    <template v-else-if="selectedTimeRange.type === date.DateRangeType.Year">
      <div class="input-group-text">
        <button
          type="button"
          class="btn btn-sm"
          :class="canGoBack ? 'btn-secondary' : 'btn-outline-secondary'"
          :disabled="!canGoBack"
          @click.prevent="selectedTimeRange.deltaRange(-1)"
        >
          ⇦
        </button>
      </div>
      <input
        type="number"
        style="width: 4rem"
        class="form-control form-control-sm"
        name="selected-year"
        :min="timeline.minDate.getFullYear()"
        :max="timeline.maxDate.getFullYear()"
        step="1"
        :value="selectedTimeRange.start.getFullYear()"
        required
        @input="selectedTimeRange.start = new Date((($event.target as HTMLInputElement).valueAsNumber || selectedTimeRange.start.getFullYear()), 0, 1)"
      />
      <div class="input-group-text">
        <button
          type="button"
          class="btn btn-sm"
          :class="canGoForward ? 'btn-secondary' : 'btn-outline-secondary'"
          :disabled="!canGoForward"
          @click.prevent="selectedTimeRange.deltaRange(1)"
        >
          ⇨
        </button>
      </div>
    </template>
    <template v-if="selectedTimeRange.type === date.DateRangeType.Custom">
      <input
        type="date"
        style="width: 7rem"
        class="form-control form-control-sm"
        name="selected-day-start"
        :min="date.dateToIsoString(timeline.minDate)"
        :max="date.dateToIsoString(timeline.maxDate)"
        :value="date.dateToIsoString(selectedTimeRange.start)"
        required
        @input="selectedTimeRange.start = date.isoStringToDate(($event.target as HTMLInputElement).value) || selectedTimeRange.start"
        "
      />
      <input
        type="date"
        style="width: 7rem"
        class="form-control form-control-sm"
        name="selected-day-end"
        :min="date.dateToIsoString(timeline.minDate)"
        :max="date.dateToIsoString(timeline.maxDate)"
        :value="date.dateToIsoString(selectedTimeRange.end)"
        required
        @input="selectedTimeRange.end = date.getDateEndDateTime(date.isoStringToDate(($event.target as HTMLInputElement).value) || selectedTimeRange.end) "
        "
      />
    </template>
  </div>
</template>
