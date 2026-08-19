import * as z from 'zod';

const DateTimeStringSchema = z
  .string()
  .regex(/^[0-9]{4}-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]\.[0-9]{3}[+\-][0-1][0-9]:[0-5][0-9]$/);

const DateTimeStringWithOriginalSchema = z.strictObject({
  date: z.date(),
  _original: DateTimeStringSchema,
});

const DateTimeSchema = z.codec<z.ZodString, typeof DateTimeStringWithOriginalSchema>(
  DateTimeStringSchema,
  DateTimeStringWithOriginalSchema,
  {
    decode: (s) => {
      const date = new Date();
      date.setTime(new Date(s).getTime());
      return DateTimeStringWithOriginalSchema.parse({
        date,
        _original: s,
      });
    },
    encode: (o) => {
      return o._original;
    },
  },
);

const LatLngSchema = z.strictObject({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const LatLngStringSchema = z.codec<z.ZodString, typeof LatLngSchema>(
  z.string().regex(/^-?[0-9]?[0-9](\.[0-9]{1,8})?°, -?([0-1]?[0-9])?[0-9](\.[0-9]{1,8})?°$/),
  LatLngSchema,
  {
    decode: (s) => {
      const [latStr, lngStr] = s.split(',').map((part) => part.trim().replace('°', ''));
      return LatLngSchema.parse({
        lat: parseFloat(latStr),
        lng: parseFloat(lngStr),
      });
    },
    encode: (o) => `${o.lat}°, ${o.lng}°`,
  },
);

const PlaceIdSchema = z.string().regex(/^[CGE]hIJ[0-9A-Za-z_-]+$/);

const ProbabilitySchema = z.number().min(0).max(1);

const ActivityTypeSchema = z.enum([
  'BOATING',
  'CATCHING_POKEMON',
  'CYCLING',
  'EXITING_VEHICLE',
  'FLYING',
  'HIKING',
  'HORSEBACK_RIDING',
  'IN_BUS',
  'IN_CABLECAR',
  'IN_FERRY',
  'IN_FUNICULAR',
  'IN_GONDOLA_LIFT',
  'IN_PASSENGER_VEHICLE',
  'IN_RAIL_VEHICLE',
  'IN_ROAD_VEHICLE',
  'IN_SUBWAY',
  'IN_TAXI',
  'IN_TRAIN',
  'IN_TRAM',
  'IN_VEHICLE',
  'IN_WHEELCHAIR',
  'KAYAKING',
  'KITESURFING',
  'MOTORCYCLING',
  'PARAGLIDING',
  'ON_BICYCLE',
  'ON_FOOT',
  'ROWING',
  'RUNNING',
  'SAILING',
  'SKATEBOARDING',
  'SKIING',
  'SLEDDING',
  'SNOWBOARDING',
  'SNOWMOBILE',
  'SNOWSHOEING',
  'STILL',
  'SURFING',
  'SWIMMING',
  'TILTING',
  'WALKING',
  'WALKING_NORDIC',
  'UNKNOWN',
  'UNKNOWN_ACTIVITY_TYPE',
]);

const SemanticSegment_BaseSchema = z.strictObject({
  startTime: DateTimeSchema,
  endTime: DateTimeSchema,
});

const SemanticSegment_BaseWithUtcOffsetSchema = SemanticSegment_BaseSchema.extend({
  startTimeTimezoneUtcOffsetMinutes: z.number().int(),
  endTimeTimezoneUtcOffsetMinutes: z.number().int(),
});

const SemanticSegment_TimelinePathSchema = SemanticSegment_BaseSchema.extend({
  timelinePath: z
    .array(
      z.strictObject({
        point: LatLngStringSchema,
        time: DateTimeSchema,
      }),
    )
    .min(1),
}).superRefine((segment, ctx) => checkTimeLineSemanticSegment_TimelinePath(segment, ctx));

export type SemanticSegment_TimelinePath = z.infer<typeof SemanticSegment_TimelinePathSchema>;

const SemanticSegment_VisitSchema = SemanticSegment_BaseWithUtcOffsetSchema.extend({
  visit: z.strictObject({
    hierarchyLevel: z.number().int().nonnegative(),
    probability: ProbabilitySchema,
    topCandidate: z.strictObject({
      placeId: PlaceIdSchema,
      semanticType: z.enum([
        'ALIASED_LOCATION',
        'HOME',
        'INFERRED_HOME',
        'INFERRED_WORK',
        'SEARCHED_ADDRESS',
        'WORK',
        'UNKNOWN',
      ]),
      probability: ProbabilitySchema,
      placeLocation: z.strictObject({
        latLng: LatLngStringSchema,
      }),
    }),
    isTimelessVisit: z.boolean().optional(),
  }),
}).superRefine((segment, ctx) => checkSemanticSegment_Visit(segment, ctx));

export type SemanticSegment_Visit = z.infer<typeof SemanticSegment_VisitSchema>;

const SemanticSegment_ActivitySchema = SemanticSegment_BaseWithUtcOffsetSchema.extend({
  activity: z.strictObject({
    start: z.strictObject({
      latLng: LatLngStringSchema,
    }),
    end: z.strictObject({
      latLng: LatLngStringSchema,
    }),
    distanceMeters: z.number().nonnegative(),
    topCandidate: z.strictObject({
      type: ActivityTypeSchema,
      probability: ProbabilitySchema,
    }),
    probability: ProbabilitySchema.optional(),
    parking: z
      .strictObject({
        location: z.strictObject({
          latLng: LatLngStringSchema,
        }),
        startTime: DateTimeSchema,
      })
      .optional(),
  }),
}).superRefine((segment, ctx) => checkSemanticSegment_Activity(segment, ctx));

const SemanticSegment_TimelineMemorySchema = SemanticSegment_BaseWithUtcOffsetSchema.extend({
  timelineMemory: z.strictObject({
    trip: z.strictObject({
      distanceFromOriginKms: z.number().nonnegative(),
      destinations: z
        .array(
          z.strictObject({
            identifier: z.strictObject({
              placeId: PlaceIdSchema,
            }),
          }),
        )
        .optional(),
    }),
  }),
}).superRefine((segment, ctx) => checkSemanticSegment_TimelineMemory(segment, ctx));

const SemanticSegmentSchema = z.xor([
  SemanticSegment_TimelinePathSchema,
  SemanticSegment_VisitSchema,
  SemanticSegment_ActivitySchema,
  SemanticSegment_TimelineMemorySchema,
]);

function checkTimeLineSemanticSegment_Base(
  segment: z.infer<typeof SemanticSegment_BaseSchema>,
  ctx: z.RefinementCtx,
): void {
  if (segment.startTime.date > segment.endTime.date) {
    ctx.addIssue({
      code: 'custom',
      input: segment,
      message: 'startTime must be before endTime',
    });
  }
}

function checkTimeLineSemanticSegment_TimelinePath(
  segment: z.infer<typeof SemanticSegment_TimelinePathSchema>,
  ctx: z.RefinementCtx,
): void {
  checkTimeLineSemanticSegment_Base(segment, ctx);
  if (segment.timelinePath[0].time.date < segment.startTime.date) {
    ctx.addIssue({
      code: 'custom',
      input: segment,
      message: 'timelinePath[0].time must be after or equal to startTime',
    });
  }
  if (segment.timelinePath[segment.timelinePath.length - 1].time.date > segment.endTime.date) {
    ctx.addIssue({
      code: 'custom',
      input: segment,
      message: 'timelinePath[last].time must be before or equal to endTime',
    });
  }
  for (let i = 1; i < segment.timelinePath.length; i++) {
    if (segment.timelinePath[i].time.date < segment.timelinePath[i - 1].time.date) {
      ctx.addIssue({
        code: 'custom',
        input: segment,
        message: `timelinePath[${i}].time must be after or equal to timelinePath[${i - 1}].time`,
      });
    }
  }
}

function checkSemanticSegment_Visit(segment: z.infer<typeof SemanticSegment_VisitSchema>, ctx: z.RefinementCtx): void {
  checkTimeLineSemanticSegment_Base(segment, ctx);
}

function checkSemanticSegment_Activity(
  segment: z.infer<typeof SemanticSegment_ActivitySchema>,
  ctx: z.RefinementCtx,
): void {
  checkTimeLineSemanticSegment_Base(segment, ctx);
}

function checkSemanticSegment_TimelineMemory(
  segment: z.infer<typeof SemanticSegment_TimelineMemorySchema>,
  ctx: z.RefinementCtx,
): void {
  checkTimeLineSemanticSegment_Base(segment, ctx);
}

const RawSignal_PositionSchema = z.strictObject({
  position: z.strictObject({
    LatLng: LatLngStringSchema,
    accuracyMeters: z.number().nonnegative(),
    source: z.enum(['GPS', 'WIFI_ONLY', 'UNKNOWN']),
    timestamp: DateTimeSchema,
    altitudeMeters: z.number().optional(),
    speedMetersPerSecond: z.number().nonnegative().optional(),
  }),
});

const RawSignal_WifiScanSchema = z.strictObject({
  wifiScan: z.strictObject({
    deliveryTime: DateTimeSchema,
    devicesRecords: z
      .array(
        z.strictObject({
          mac: z.number().int().min(0).max(0xffffffffffff),
          rawRssi: z.number().int().min(-100).max(0),
        }),
      )
      .optional(),
  }),
});

const RawSignal_ActivityRecordSchema = z.strictObject({
  activityRecord: z.strictObject({
    probableActivities: z
      .array(
        z.strictObject({
          type: ActivityTypeSchema,
          confidence: ProbabilitySchema,
        }),
      )
      .min(1),
    timestamp: DateTimeSchema,
  }),
});

const RawSignalSchema = z.xor([RawSignal_PositionSchema, RawSignal_WifiScanSchema, RawSignal_ActivityRecordSchema]);

const UserLocationProfileSchema = z.strictObject({
  frequentPlaces: z
    .array(
      z.strictObject({
        placeId: PlaceIdSchema,
        placeLocation: LatLngStringSchema,
        label: z.enum(['HOME', 'WORK']).optional(),
      }),
    )
    .optional(),
  frequentTrips: z
    .array(
      z.strictObject({
        waypointIds: z.array(PlaceIdSchema).min(2),
        modeDistribution: z
          .array(
            z.strictObject({
              mode: ActivityTypeSchema,
              rate: ProbabilitySchema,
            }),
          )
          .min(1),
        startTimeMinutes: z.number().int().nonnegative(),
        endTimeMinutes: z.number().int().nonnegative(),
        durationMinutes: z.number().int().nonnegative(),
        confidence: ProbabilitySchema,
        commuteDirection: z.enum(['COMMUTE_DIRECTION_HOME_TO_WORK', 'COMMUTE_DIRECTION_WORK_TO_HOME']),
      }),
    )
    .optional(),
  persona: z
    .strictObject({
      travelModeAffinities: z
        .array(
          z.strictObject({
            mode: ActivityTypeSchema,
            affinity: ProbabilitySchema,
          }),
        )
        .optional(),
    })
    .optional(),
});

export const TimelineSchema = z.strictObject({
  semanticSegments: z.array(SemanticSegmentSchema).optional(),
  rawSignals: z.array(RawSignalSchema).optional(),
  userLocationProfile: UserLocationProfileSchema.optional(),
});

export type TimelineBase = z.infer<typeof TimelineSchema>;

function getSignalTime(signal: z.infer<typeof RawSignalSchema>): Date {
  if ('position' in signal) {
    return signal.position.timestamp.date; // RawSignal_Position
  } else if ('wifiScan' in signal) {
    return signal.wifiScan.deliveryTime.date; // RawSignal_WifiScan
  } else {
    return signal.activityRecord.timestamp.date; // RawSignal_ActivityRecord
  }
}

export type Timeline = TimelineBase & {
  minDate: Date;
  maxDate: Date;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

function finalizeTimeline(timeline: TimelineBase): Timeline | null {
  const result = timeline as Timeline;
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  let minLat: number | null = null;
  let maxLat: number | null = null;
  let minLng: number | null = null;
  let maxLng: number | null = null;
  function visitDate(date: Date): void {
    if (!minDate || date < minDate) {
      minDate = date;
    }
    if (!maxDate || date > maxDate) {
      maxDate = date;
    }
  }
  function visitLatLng(lat: number, lng: number): void {
    if (minLat === null || lat < minLat) {
      minLat = lat;
    }
    if (maxLat === null || lat > maxLat) {
      maxLat = lat;
    }
    if (minLng === null || lng < minLng) {
      minLng = lng;
    }
    if (maxLng === null || lng > maxLng) {
      maxLng = lng;
    }
  }
  if (result.semanticSegments) {
    result.semanticSegments.forEach((segment) => {
      visitDate(segment.startTime.date);
      visitDate(segment.endTime.date);
      if ('timelinePath' in segment) {
        segment.timelinePath.forEach((point) => {
          visitDate(point.time.date);
          visitLatLng(point.point.lat, point.point.lng);
        });
      }
      if ('visit' in segment) {
        visitLatLng(
          segment.visit.topCandidate.placeLocation.latLng.lat,
          segment.visit.topCandidate.placeLocation.latLng.lng,
        );
      }
      if ('activity' in segment) {
        visitLatLng(segment.activity.start.latLng.lat, segment.activity.start.latLng.lng);
        visitLatLng(segment.activity.end.latLng.lat, segment.activity.end.latLng.lng);
        if (segment.activity.parking) {
          visitLatLng(segment.activity.parking.location.latLng.lat, segment.activity.parking.location.latLng.lng);
        }
      }
    });
  }
  if (result.rawSignals) {
    result.rawSignals.forEach((signal) => {
      visitDate(getSignalTime(signal));
      if ('position' in signal) {
        visitLatLng(signal.position.LatLng.lat, signal.position.LatLng.lng);
      }
    });
  }
  if (
    minDate === null ||
    maxDate === null ||
    minLat === null ||
    maxLat === null ||
    minLng === null ||
    maxLng === null
  ) {
    return null;
  }
  result.minDate = minDate;
  result.maxDate = maxDate;
  result.minLat = minLat;
  result.maxLat = maxLat;
  result.minLng = minLng;
  result.maxLng = maxLng;
  return Object.freeze(result);
}

export function loadTimelineJson(json: string | object): Timeline {
  const parsed = typeof json === 'string' ? JSON.parse(json) : json;
  const rawTimeline = TimelineSchema.parse(parsed);

  const result = finalizeTimeline(rawTimeline);
  if (!result) {
    throw new Error('Timeline is empty');
  }
  return result;
}

function sliceSemanticSegments(
  segments: z.infer<typeof SemanticSegmentSchema>[],
  startDate: Date | null,
  endDate: Date | null,
): z.infer<typeof SemanticSegmentSchema>[] {
  const slicedSegments: z.infer<typeof SemanticSegmentSchema>[] = [];
  for (const segment of segments) {
    if (startDate && segment.endTime.date < startDate) {
      continue;
    }
    if (endDate && segment.startTime.date > endDate) {
      continue;
    }
    slicedSegments.push(structuredClone(segment));
  }
  return slicedSegments;
}

function sliceRawSignals(
  signals: z.infer<typeof RawSignalSchema>[],
  startDate: Date | null,
  endDate: Date | null,
): z.infer<typeof RawSignalSchema>[] {
  const slicedSignals: z.infer<typeof RawSignalSchema>[] = [];
  for (const signal of signals) {
    const signalTime = getSignalTime(signal);
    if (startDate && signalTime < startDate) {
      continue;
    }
    if (endDate && signalTime > endDate) {
      continue;
    }
    slicedSignals.push(structuredClone(signal));
  }
  return slicedSignals;
}

export function sliceTimelineByDateRange(
  timeline: TimelineBase,
  startDate: Date | null,
  endDate: Date | null,
): Timeline | null {
  const result: TimelineBase = {};
  if (timeline.semanticSegments) {
    result.semanticSegments = sliceSemanticSegments(timeline.semanticSegments, startDate, endDate);
  }
  if (timeline.rawSignals) {
    result.rawSignals = sliceRawSignals(timeline.rawSignals, startDate, endDate);
  }
  if (timeline.userLocationProfile) {
    result.userLocationProfile = structuredClone(timeline.userLocationProfile);
  }

  return finalizeTimeline(result);
}
