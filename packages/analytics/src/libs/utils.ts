import { addDays, addWeeks, formatISO, startOfWeek } from "date-fns";

export type TimeUnit = "day" | "week";

interface FillOptions {
  unit?: TimeUnit;
  range?: number; // days or weeks depending on unit
  valueKeys?: string[];
}

export function fillMissingTimeUnits<T extends { date: string }>(
  data: T[],
  { unit = "day", range = 30, valueKeys = [] }: FillOptions = {},
) {
  const result: T[] = [];

  const today = new Date();
  const stepFn = unit === "week" ? addWeeks : addDays;
  const start = stepFn(today, -(range - 1));

  const normalize = (date: Date) =>
    unit === "week" ? startOfWeek(date, { weekStartsOn: 1 }) : date;

  const map = new Map<string, T>();
  for (const d of data) {
    const key = formatISO(normalize(new Date(d.date)), { representation: "date" });
    map.set(key, d);
  }

  for (let d = normalize(start); d <= today; d = stepFn(d, 1)) {
    const key = formatISO(normalize(d), { representation: "date" });
    const existing = map.get(key);
    const entry = { date: key } as T;
    for (const k of valueKeys) {
      entry[k] = existing ? Number(existing[k]) : (0 as T[keyof T]);
    }
    result.push(entry);
  }

  return result;
}