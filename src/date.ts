export enum DateRangeType {
  Day = 'day',
  Year = 'year',
  Custom = 'custom',
}

export interface DateRange {
  type: DateRangeType;
  start: Date;
  end: Date;
  deltaRange(delta: number): void;
}
export class DateRangeImplementation implements DateRange {
  private _type: DateRangeType;
  private _start!: Date;
  private _end!: Date;

  constructor(type?: DateRangeType, start?: Date, end?: Date) {
    this._type = type ?? DateRangeType.Day;
    this.start = start ?? getToday();
    if (this._type === DateRangeType.Custom) {
      this._end = end ?? getDateEndDateTime(getToday());
    }
  }
  get type(): DateRangeType {
    return this._type;
  }
  set type(value: DateRangeType) {
    if (this._type === value) {
      return;
    }
    switch (value) {
      case DateRangeType.Day:
        this._type = value;
        this.start = this._start;
        break;
      case DateRangeType.Year:
        this._type = value;
        this.start = this._start;
        break;
      case DateRangeType.Custom:
        this._type = value;
        break;
    }
  }
  get start(): Date {
    return this._start;
  }
  set start(value: Date) {
    switch (this._type) {
      case DateRangeType.Day:
        this._start = getDate(value);
        this.updateEnd();
        break;
      case DateRangeType.Year:
        this._start = getDate(new Date(value.getFullYear(), 0, 1));
        this.updateEnd();
        break;
      case DateRangeType.Custom:
        this._start = value;
        break;
    }
  }
  get end(): Date {
    return this._end;
  }
  set end(value: Date) {
    if (this._type !== DateRangeType.Custom) {
      throw new Error('Cannot set end date for non-custom date ranges');
    }
    this._end = value;
  }
  deltaRange(delta: number): void {
    switch (this._type) {
      case DateRangeType.Day:
        this.start = addDaysToDate(this._start, delta);
        break;
      case DateRangeType.Year:
        this.start = new Date(this._start.getFullYear() + delta, 0, 1);
        break;
      default:
        throw new Error('Cannot delta range for non-day/year date ranges');
    }
  }
  private updateEnd(): void {
    switch (this._type) {
      case DateRangeType.Day:
        this._end = getDateEndDateTime(this._start);
        break;
      case DateRangeType.Year:
        this._end = getDateEndDateTime(new Date(this._start.getFullYear(), 11, 31));
        break;
    }
  }
}

export function getToday(): Date {
  return getDate(new Date());
}

export function getDate(date: Date): Date {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

export function getDateEndDateTime(date: Date): Date {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
}

export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function isoStringToDate(isoString: string): Date | null {
  if (!isoString) {
    return null;
  }
  const m = isoString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    return null;
  }
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  if (month < 1 || month > 12 || day <= 0 || day > getDaysInMonth(month, year)) {
    return null;
  }
  return new Date(year, month - 1, day);
}

export function dateToIsoString(date: Date): string {
  return [
    date.getFullYear().toString().padStart(4, '0'),
    (date.getMonth() + 1).toString().padStart(2, '0'),
    date.getDate().toString().padStart(2, '0'),
  ].join('-');
}

export function addDaysToDate(date: Date, days: number): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}
