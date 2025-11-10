export function fillMissingDates<
  T extends { date: string; [key: string]: number | string }
>(
  data: T[],
  valueKeys: (keyof T)[],
  days = 30
): T[] {
  const result: T[] = [];
  const today = new Date();
  const start = new Date();
  start.setDate(today.getDate() - (days - 1));

  // Build lookup map: { 'YYYY-MM-DD': original data object }
  const map = new Map<string, T>();
  for (const d of data) {
    const key = new Date(d.date).toISOString().split("T")[0];
    map.set(key, d);
  }

  // Fill day by day
  for (let day = new Date(start); day <= today; day.setDate(day.getDate() + 1)) {
    const key = day.toISOString().split("T")[0];
    const existing = map.get(key);

    // Create base object with date and 0 defaults for all keys
    const filled = { date: key } as T;
    for (const k of valueKeys) {
      filled[k] = Number(existing?.[k] ?? 0) as T[typeof k];
    }

    result.push(filled);
  }

  return result;
}

