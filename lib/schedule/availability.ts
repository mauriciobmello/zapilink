import type {
  AvailabilityException,
  AvailabilityRule,
  AvailableSlot,
  BookedCount,
} from "@/types/schedule";

const MS_PER_MIN = 60_000;
const MAX_AVAILABILITY_DAYS = 60;

function dateInTz(utcMs: number, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const parts: Record<string, string> = {};
  for (const part of dtf.formatToParts(new Date(utcMs))) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  const weekdays: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: weekdays[parts.weekday] ?? 0,
  };
}

function offsetMinutes(date: string, timeZone: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 12);
  const parts = dateInTz(guess, timeZone);
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );
  return Math.round((localAsUtc - guess) / MS_PER_MIN);
}

function zonedWeekday(date: string, timeZone: string): number {
  const offset = offsetMinutes(date, timeZone);
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - offset * MS_PER_MIN).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + days * 86_400_000);
  return dt.toISOString().slice(0, 10);
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function overlaps(slotStart: number, slotEnd: number, from: number, to: number) {
  return slotStart < to && from < slotEnd;
}

export interface ComputeAvailabilityParams {
  timeZone: string;
  durationMinutes: number;
  defaultCapacity: number;
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  bookings: BookedCount[];
  busyIntervals: { start: Date; end: Date }[];
  fromDate?: string;
  days?: number;
}

export function computeAvailability(
  params: ComputeAvailabilityParams,
): AvailableSlot[] {
  const {
    timeZone,
    durationMinutes,
    defaultCapacity,
    rules,
    exceptions,
    bookings,
    busyIntervals,
  } = params;

  const fromDate = params.fromDate ?? dateInTz(Date.now(), timeZone).date;
  const days = Math.min(
    params.days ?? MAX_AVAILABILITY_DAYS,
    MAX_AVAILABILITY_DAYS,
  );

  const bookedCounts = new Map<string, number>();
  for (const b of bookings) {
    const key = `${b.slot_date}|${b.slot_start_time}`;
    bookedCounts.set(key, (bookedCounts.get(key) ?? 0) + b.count);
  }

  const busyByDate = new Map<string, { start: number; end: number }[]>();
  for (const interval of busyIntervals) {
    const startParts = dateInTz(interval.start.getTime(), timeZone);
    const endParts = dateInTz(interval.end.getTime(), timeZone);
    const list = busyByDate.get(startParts.date) ?? [];
    list.push({
      start: startParts.hour * 60 + startParts.minute,
      end: endParts.hour * 60 + endParts.minute,
    });
    busyByDate.set(startParts.date, list);
  }

  const slots: AvailableSlot[] = [];

  for (let i = 0; i < days; i++) {
    const date = addDays(fromDate, i);
    const weekday = zonedWeekday(date, timeZone);

    const dayExceptions = exceptions.filter((e) => e.date === date);
    const fullyBlocked = dayExceptions.some(
      (e) => e.type === "blocked" && !e.start_time,
    );
    if (fullyBlocked) continue;

    const blockedRanges = dayExceptions
      .filter((e) => e.type === "blocked" && e.start_time && e.end_time)
      .map((e) => ({ start: toMinutes(e.start_time!), end: toMinutes(e.end_time!) }));

    const dayRules = rules.filter((r) => r.day_of_week === weekday);
    if (dayRules.length === 0) continue;

    for (const rule of dayRules) {
      const start = toMinutes(rule.start_time);
      const end = toMinutes(rule.end_time);
      if (end <= start) continue;

      for (
        let slotStart = start;
        slotStart + durationMinutes <= end;
        slotStart += durationMinutes
      ) {
        const slotEnd = slotStart + durationMinutes;

        if (
          blockedRanges.some((b) =>
            overlaps(slotStart, slotEnd, b.start, b.end),
          )
        ) {
          continue;
        }

        const override = dayExceptions.find(
          (e) =>
            e.type === "capacity_override" &&
            e.start_time === fromMinutes(slotStart) &&
            e.end_time === fromMinutes(slotEnd) &&
            e.capacity !== null,
        );
        const capacity = override ? override.capacity! : defaultCapacity;
        if (capacity <= 0) continue;

        const key = `${date}|${fromMinutes(slotStart)}`;
        const booked = bookedCounts.get(key) ?? 0;
        const remaining = capacity - booked;
        if (remaining < 0) continue; // Never return negative capacity

        const busyForDate = busyByDate.get(date) ?? [];
        if (
          busyForDate.some((b) => overlaps(slotStart, slotEnd, b.start, b.end))
        ) {
          continue;
        }

        slots.push({
          date,
          start_time: fromMinutes(slotStart),
          end_time: fromMinutes(slotEnd),
          remaining_capacity: remaining,
        });
      }
    }
  }

  return slots;
}

export function todayInTimeZone(timeZone: string): string {
  return dateInTz(Date.now(), timeZone).date;
}

export function toUtcIso(date: string, time: string, timeZone: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const offset = offsetMinutes(date, timeZone);
  return new Date(
    Date.UTC(y, m - 1, d, h, mi) - offset * MS_PER_MIN,
  ).toISOString();
}