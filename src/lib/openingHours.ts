// Lightweight parser for the OSM `opening_hours` tag. It covers the common
// patterns seen in Vietnam (e.g. "Mo-Su 08:00-22:00", "24/7",
// "Mo-Fr 08:00-12:00,13:00-17:00; Sa 09:00-12:00"). Anything it cannot
// confidently parse returns "unknown" so the UI can simply hide the badge.

export type OpenState = "open" | "closed" | "unknown";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const DAY_INDEX: Record<string, number> = {
  Su: 0,
  Mo: 1,
  Tu: 2,
  We: 3,
  Th: 4,
  Fr: 5,
  Sa: 6,
};

interface TimeRange {
  start: number; // minutes from midnight
  end: number; // minutes from midnight (may be > 1440 when crossing midnight)
}

function parseTime(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59) return null;
  return h * 60 + min;
}

// Parses a day token group like "Mo-Fr" or "Mo,We,Fr" into a set of weekday
// indices (0=Sunday..6=Saturday). Returns null if it cannot be parsed.
function parseDays(spec: string): Set<number> | null {
  const days = new Set<number>();
  for (const part of spec.split(",")) {
    const token = part.trim();
    const range = /^([A-Za-z]{2})-([A-Za-z]{2})$/.exec(token);
    if (range) {
      const from = DAY_INDEX[normalizeDay(range[1])];
      const to = DAY_INDEX[normalizeDay(range[2])];
      if (from === undefined || to === undefined) return null;
      // Walk forward, wrapping around the week (e.g. Fr-Mo).
      let i = from;
      for (let guard = 0; guard < 8; guard++) {
        days.add(i);
        if (i === to) break;
        i = (i + 1) % 7;
      }
    } else {
      const idx = DAY_INDEX[normalizeDay(token)];
      if (idx === undefined) return null;
      days.add(idx);
    }
  }
  return days;
}

function normalizeDay(d: string): string {
  return d.charAt(0).toUpperCase() + d.slice(1, 2).toLowerCase();
}

function parseTimeRanges(spec: string): TimeRange[] | null {
  const ranges: TimeRange[] = [];
  for (const part of spec.split(",")) {
    const token = part.trim();
    if (token.toLowerCase() === "off") continue;
    const m = /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(token);
    if (!m) return null;
    const start = parseTime(m[1]);
    let end = parseTime(m[2]);
    if (start === null || end === null) return null;
    if (end <= start) end += 24 * 60; // crosses midnight
    ranges.push({ start, end });
  }
  return ranges;
}

function minutesNow(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

function rangeCovers(ranges: TimeRange[], minute: number): boolean {
  return ranges.some((r) => {
    if (minute >= r.start && minute < r.end) return true;
    // Also match the "after midnight" tail of a wrapping range.
    if (r.end > 1440 && minute + 1440 >= r.start && minute + 1440 < r.end) {
      return true;
    }
    return false;
  });
}

export function isOpenNow(spec: string | undefined, now: Date = new Date()): OpenState {
  if (!spec) return "unknown";
  const trimmed = spec.trim();
  if (!trimmed) return "unknown";
  if (trimmed === "24/7") return "open";

  const today = now.getDay();
  const yesterday = (today + 6) % 7;
  const nowMin = minutesNow(now);

  let matchedAnyRule = false;
  let openToday = false;

  for (const rawRule of trimmed.split(";")) {
    const rule = rawRule.trim();
    if (!rule) continue;

    // Split into "<days> <times>" — the day part is optional (then every day).
    const firstSpace = rule.search(/\s/);
    let daySpec = "";
    let timeSpec = rule;
    if (/^[A-Za-z]/.test(rule) && firstSpace > 0) {
      daySpec = rule.slice(0, firstSpace).trim();
      timeSpec = rule.slice(firstSpace).trim();
    }

    // Reject features we don't model (public holidays, month/week rules).
    if (/PH|SH|week|\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i.test(daySpec)) {
      return "unknown";
    }

    let days: Set<number> | null;
    if (daySpec === "") {
      days = new Set(DAYS.map((_, i) => i)); // all days
    } else {
      days = parseDays(daySpec);
      if (!days) return "unknown";
    }

    if (timeSpec.toLowerCase() === "off" || timeSpec.toLowerCase() === "closed") {
      matchedAnyRule = true;
      continue;
    }

    const ranges = parseTimeRanges(timeSpec);
    if (!ranges) return "unknown";
    matchedAnyRule = true;

    if (days.has(today) && rangeCovers(ranges, nowMin)) {
      openToday = true;
    }
    // Handle ranges from yesterday that cross midnight into today.
    if (days.has(yesterday)) {
      const wrapping = ranges.filter((r) => r.end > 1440);
      if (wrapping.length && rangeCovers(wrapping, nowMin + 1440)) {
        openToday = true;
      }
    }
  }

  if (!matchedAnyRule) return "unknown";
  return openToday ? "open" : "closed";
}

export function openStateLabel(state: OpenState): string | null {
  if (state === "open") return "Đang mở cửa";
  if (state === "closed") return "Đã đóng cửa";
  return null;
}
