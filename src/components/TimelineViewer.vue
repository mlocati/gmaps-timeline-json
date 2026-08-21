<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {type SemanticSegment_TimelinePath, type SemanticSegment_Visit, type Timeline} from '../timeline';
import L from 'leaflet';
import {getPlaceDisplayName, getPlaceDisplayNameFromCache, hasApiKey} from '../places_api';
import {DateRangeType} from '../date';

const props = defineProps<{
  timeline: Timeline;
  dateRangeType: DateRangeType;
}>();

const mapContainer = ref<HTMLDivElement | null>(null);

let map: L.Map | null = null;
const dataLayers: Array<L.LayerGroup> = [];

onMounted(() => {
  if (!map) {
    map = L.map(mapContainer.value!);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
  }
  updateMap(true);
});
watch(
  () => props.timeline,
  () => {
    updateMap();
  },
);
onBeforeUnmount(() => {
  if (map) {
    dataLayers.splice(0, dataLayers.length);
    map.remove();
    map = null;
  }
});
function updateMap(initial?: boolean): void {
  if (!map) {
    return;
  }
  map.stop();
  dataLayers.splice(0, dataLayers.length).forEach((layer) => {
    map!.removeLayer(layer);
  });
  map.addLayer((dataLayers[0] = L.layerGroup()));
  map.addLayer((dataLayers[1] = L.layerGroup()));
  if (props.timeline.semanticSegments) {
    for (const segment of props.timeline.semanticSegments) {
      if ('timelinePath' in segment) {
        const polyline = L.polyline(
          segment.timelinePath.map((item) => item.point),
          {color: 'red', weight: 3},
        );
        setTimelinePathTooltip(polyline, segment);
        polyline.addTo(dataLayers[0]);
      }
      if ('visit' in segment) {
        const marker = L.circleMarker(segment.visit.topCandidate.placeLocation.latLng, {
          radius: 4,
          color: 'blue',
          weight: 6,
          fillColor: 'blue',
          fillOpacity: 0.5,
        });
        setPlaceTooltip(marker, segment);
        marker.addTo(dataLayers[1]);
      }
    }
  }
  if (initial) {
    map = map.setView(
      {
        lat: props.timeline.minLat + (props.timeline.maxLat - props.timeline.minLat) / 2,
        lng: props.timeline.minLng + (props.timeline.maxLng - props.timeline.minLng) / 2,
      },
      13,
    );
  } else {
    map.flyToBounds(
      [
        [props.timeline.minLat, props.timeline.minLng],
        [props.timeline.maxLat, props.timeline.maxLng],
      ],
      {
        duration: 0.3,
      },
    );
  }
}

function formatDateTime(date: Date): string {
  return props.dateRangeType === DateRangeType.Day ? date.toLocaleTimeString() : date.toLocaleString();
}

/**
 * Show the time (and the date, if the displayed range is not a single day) corresponding to the
 * position of the mouse pointer along the timeline path: the time is linearly interpolated between
 * the two points delimiting the path segment the mouse pointer is closest to.
 * That path segment is also highlighted while the mouse pointer hovers the path.
 */
function setTimelinePathTooltip(polyline: L.Polyline, segment: SemanticSegment_TimelinePath): void {
  const ttip = document.createElement('div');
  ttip.style.fontSize = '12px';
  ttip.style.fontWeight = 'bold';
  ttip.style.whiteSpace = 'pre';
  const pathLayer = dataLayers[0];
  let highlight: L.Polyline | null = null;
  const removeHighlight = (): void => {
    if (highlight) {
      pathLayer.removeLayer(highlight);
      highlight = null;
    }
  };
  const highlightSegment = (index: number): void => {
    const points = [segment.timelinePath[index - 1].point, segment.timelinePath[index].point];
    if (highlight) {
      highlight.setLatLngs(points);
    } else {
      highlight = L.polyline(points, {color: 'orange', weight: 9, opacity: 0.8, interactive: false});
      highlight.addTo(pathLayer);
      highlight.bringToBack();
    }
  };
  /**
   * Find the timeline path segment nearest to the mouse pointer, returning its ending point index
   * and how far (from 0 to 1) the mouse pointer is between its starting and ending points.
   */
  const nearestPathSegment = (latLng: L.LatLng): {index: number; ratio: number} | null => {
    const path = segment.timelinePath;
    if (!map || path.length < 2) {
      return null;
    }
    const mousePoint = map.latLngToLayerPoint(latLng);
    let bestDistance = Number.POSITIVE_INFINITY;
    let result: {index: number; ratio: number} | null = null;
    let previousPoint = map.latLngToLayerPoint(path[0].point);
    for (let index = 1; index < path.length; index++) {
      const currentPoint = map.latLngToLayerPoint(path[index].point);
      const closestPoint = L.LineUtil.closestPointOnSegment(mousePoint, previousPoint, currentPoint);
      const distance = closestPoint.distanceTo(mousePoint);
      if (distance < bestDistance) {
        bestDistance = distance;
        const length = previousPoint.distanceTo(currentPoint);
        result = {index, ratio: length === 0 ? 0 : previousPoint.distanceTo(closestPoint) / length};
      }
      previousPoint = currentPoint;
    }
    return result;
  };
  const updateTooltip = (event: L.LeafletMouseEvent): void => {
    const nearest = nearestPathSegment(event.latlng);
    if (nearest === null) {
      removeHighlight();
      ttip.textContent = formatDateTime(segment.timelinePath[0].time.date);
      return;
    }
    highlightSegment(nearest.index);
    const previousTime = segment.timelinePath[nearest.index - 1].time.date.getTime();
    const currentTime = segment.timelinePath[nearest.index].time.date.getTime();
    ttip.textContent = formatDateTime(new Date(previousTime + (currentTime - previousTime) * nearest.ratio));
  };
  polyline.on('mouseover', updateTooltip);
  polyline.on('mousemove', updateTooltip);
  polyline.on('mouseout', removeHighlight);
  polyline.on('remove', removeHighlight);
  polyline.bindTooltip(ttip, {sticky: true});
}

async function setPlaceTooltip(mapItem: L.Path, segment: SemanticSegment_Visit): Promise<void> {
  mapItem.on('click', () => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${segment.visit.topCandidate.placeId}`,
      '_blank',
    );
  });
  const createTooltip = (displayName: string): void => {
    const ttip = document.createElement('div');
    ttip.style.fontSize = '12px';
    ttip.style.fontWeight = 'bold';
    ttip.style.whiteSpace = 'pre';
    let dateRangeText: string;
    if (props.dateRangeType === DateRangeType.Day) {
      dateRangeText = `${segment.startTime.date.toLocaleTimeString()} → ${segment.endTime.date.toLocaleTimeString()}`;
    } else if (segment.startTime.date.toDateString() === segment.endTime.date.toDateString()) {
      dateRangeText = `${segment.startTime.date.toLocaleDateString()} (${segment.startTime.date.toLocaleTimeString()} → ${segment.endTime.date.toLocaleTimeString()})`;
    } else {
      dateRangeText = `${segment.startTime.date.toLocaleString()} → ${segment.endTime.date.toLocaleString()}`;
    }
    if (displayName === '') {
      ttip.textContent = dateRangeText;
    } else {
      ttip.textContent = displayName + `\n${dateRangeText}`;
    }
    mapItem.bindTooltip(ttip, {sticky: true});
  };
  if (hasApiKey()) {
    const cachedName = await getPlaceDisplayNameFromCache(segment.visit.topCandidate.placeId);
    if (cachedName) {
      createTooltip(cachedName);
      return;
    }
    let mouseExited: boolean = false;
    mapItem.on('mouseout', async () => {
      mouseExited = true;
    });
    mapItem.on('mouseover', async () => {
      mapItem.off('mouseover');
      const displayName = await getPlaceDisplayName(segment.visit.topCandidate.placeId);
      mapItem.off('mouseout');
      createTooltip(displayName);
      if (!mouseExited) {
        mapItem.openTooltip();
      }
    });
  }
}
</script>
<template>
  <div ref="mapContainer" style="flex: 1"></div>
</template>
