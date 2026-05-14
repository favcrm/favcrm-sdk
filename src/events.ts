import type {
  ApiEvent,
  Event,
  EventDate,
  EventDeliveryMode,
} from "./types/event.js";

function getCloseDate(
  startDate: string | null,
  endDate: string | null,
): Date | null {
  const value = endDate || startDate;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sessionHasEnded(
  date: Pick<EventDate, "startTime" | "endTime">,
): boolean {
  const close = getCloseDate(date.startTime, date.endTime);
  return close !== null && close.getTime() <= Date.now();
}

function getApiDateCloseTime(date: ApiEvent["dates"][number]): number {
  return (
    getCloseDate(date.startTime, date.endTime ?? null)?.getTime() ?? Infinity
  );
}

function normalizeApiStatus(status: string): Event["status"] | null {
  const statusLower = status.toLowerCase();
  if (
    statusLower === "upcoming" ||
    statusLower === "ongoing" ||
    statusLower === "past" ||
    statusLower === "cancelled" ||
    statusLower === "published"
  ) {
    return statusLower;
  }
  return null;
}

function deriveEventStatus(raw: ApiEvent): Event["status"] {
  const normalized = normalizeApiStatus(raw.status);
  if (normalized === "cancelled") return "cancelled";

  const dates = raw.dates ?? [];
  if (dates.length === 0) {
    return normalized === "published" ? "published" : normalized ?? "upcoming";
  }

  if (normalized && normalized !== "published" && normalized !== "past")
    return normalized;

  const now = Date.now();
  const hasOngoing = dates.some((date) => {
    const start = new Date(date.startTime).getTime();
    const close = getApiDateCloseTime(date);
    return Number.isFinite(start) && start <= now && close > now;
  });
  if (hasOngoing) return "ongoing";

  const allEnded = dates.every((date) => getApiDateCloseTime(date) <= now);
  return allEnded ? "past" : "upcoming";
}

function getDisplayDate(dates: EventDate[]): EventDate | null {
  return getAvailableEventDates({ dates } as Event)[0] ?? dates[0] ?? null;
}

/** Map raw v6 API event to the normalized Event shape. */
export function mapApiEvent(raw: ApiEvent): Event {
  const dates = (raw.dates || []).map((d) => {
    const id = d.id ?? null;
    const close = getCloseDate(d.startTime, d.endTime ?? null);
    const expired = (close?.getTime() ?? Infinity) <= Date.now();
    const quotaExhausted =
      d.remainingQuota !== undefined &&
      d.remainingQuota !== null &&
      d.remainingQuota <= 0;
    const inferredAvailable = !(expired || quotaExhausted);
    // A session is unbookable without an id, regardless of backend flags —
    // clients use this to drive booking UI and must not submit a null id.
    const available = id ? (d.available ?? inferredAvailable) : false;
    return {
      id,
      startTime: d.startTime,
      endTime: d.endTime ?? null,
      allDay: d.allDay ?? false,
      remainingQuota: d.remainingQuota ?? null,
      isExpired: d.isExpired ?? expired,
      isFull: d.isFull ?? quotaExhausted,
      available,
    };
  });
  const displayDate = getDisplayDate(dates);

  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    description: raw.introduction || raw.content || "",
    imageUrl: raw.image || null,
    startDate: displayDate?.startTime ?? null,
    endDate: displayDate?.endTime ?? null,
    dates,
    location: raw.venue || null,
    price: raw.price,
    currency: raw.currency,
    isFree: raw.price === 0,
    remainingQuota: null,
    status: deriveEventStatus(raw),
    maxTicketsPerOrder: raw.maxTicketsPerOrder ?? 10,
    maxTicketsPerMember: raw.maxTicketsPerMember ?? null,
    deliveryMode: raw.deliveryMode ?? "in_person",
  };
}

// ---------------------------------------------------------------------------
// Display helpers — framework-agnostic, used by storefront UIs.
// ---------------------------------------------------------------------------

/**
 * Sessions a customer can actually book: must have an id, be flagged
 * available, and not be expired or full.
 */
export function getAvailableEventDates(event: Event): EventDate[] {
  return event.dates.filter(
    (d) =>
      d.id && d.available && !d.isExpired && !d.isFull && !sessionHasEnded(d),
  );
}

/** First bookable session, or first session, or null when none exist. */
export function getPrimaryEventDate(event: Event): EventDate | null {
  return getAvailableEventDates(event)[0] ?? event.dates[0] ?? null;
}

/** True when the event has at least one bookable session and isn't past/cancelled. */
export function isEventBookable(event: Event): boolean {
  if (event.status === "cancelled") return false;
  return getAvailableEventDates(event).length > 0;
}

/**
 * Maximum allowed quantity for a registration, clamped by both the
 * event-level cap and the session's remaining quota.
 */
export function getMaxOrderQuantity(
  event: Event,
  date: EventDate | null,
): number {
  const cap = Math.max(1, event.maxTicketsPerOrder);
  const remaining = date?.remainingQuota;
  if (typeof remaining === "number" && remaining > 0) {
    return Math.min(cap, remaining);
  }
  return cap;
}

/** Sort upcoming events by primary session start time, ascending. */
export function sortEventsForDisplay(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const aTime = getPrimaryEventDate(a)?.startTime ?? "";
    const bTime = getPrimaryEventDate(b)?.startTime ?? "";
    return aTime.localeCompare(bTime);
  });
}

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(
  currency: string,
  locale: string,
): Intl.NumberFormat {
  const code = (currency || "HKD").toUpperCase();
  const key = `${locale}|${code}`;
  let formatter = currencyFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    });
    currencyFormatterCache.set(key, formatter);
  }
  return formatter;
}

export interface FormatEventPriceOptions {
  /** BCP-47 locale; defaults to "en". */
  locale?: string;
  /** Label shown when `event.isFree`. Defaults to "Free". */
  freeLabel?: string;
}

export function formatEventPrice(
  event: Event,
  opts: FormatEventPriceOptions = {},
): string {
  const { locale = "en", freeLabel = "Free" } = opts;
  if (event.isFree || event.price <= 0) return freeLabel;
  return getCurrencyFormatter(event.currency, locale).format(event.price);
}

export interface FormatEventDateOptions {
  /** BCP-47 locale; defaults to "en". */
  locale?: string;
  /** IANA time zone, e.g. "Asia/Hong_Kong". Defaults to runtime tz. */
  timeZone?: string;
  /** Label shown when date is null/invalid. Defaults to "TBA". */
  fallbackLabel?: string;
  /** Optional suffix appended after time-of-day output (e.g. "HKT"). */
  timezoneLabel?: string;
}

export function formatEventDate(
  date: EventDate | null,
  opts: FormatEventDateOptions = {},
): string {
  const {
    locale = "en",
    timeZone,
    fallbackLabel = "TBA",
    timezoneLabel,
  } = opts;
  if (!date) return fallbackLabel;
  const start = new Date(date.startTime);
  if (Number.isNaN(start.getTime())) return fallbackLabel;
  const dateOnly = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone,
  });
  if (date.allDay) return dateOnly.format(start);
  const dateTime = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
  const end = date.endTime ? new Date(date.endTime) : null;
  const suffix = timezoneLabel ? ` ${timezoneLabel}` : "";
  if (end && !Number.isNaN(end.getTime())) {
    return `${dateTime.format(start)} - ${dateTime.format(end)}${suffix}`;
  }
  return `${dateTime.format(start)}${suffix}`;
}

const DELIVERY_MODE_LABELS: Record<EventDeliveryMode, string> = {
  online: "Online",
  hybrid: "Online & in-person",
  in_person: "In-person",
};

export function getDeliveryModeLabel(mode: EventDeliveryMode): string {
  return DELIVERY_MODE_LABELS[mode] ?? "In-person";
}

export interface EventAvailabilityLabels {
  cancelled?: string;
  past?: string;
  full?: string;
  open?: string;
}

export function getEventAvailabilityLabel(
  event: Event,
  labels: EventAvailabilityLabels = {},
): string {
  if (event.status === "cancelled") return labels.cancelled ?? "Cancelled";
  if (event.status === "past" && getAvailableEventDates(event).length === 0)
    return labels.past ?? "Ended";
  if (getAvailableEventDates(event).length === 0)
    return labels.full ?? "Sold out";
  return labels.open ?? "Open";
}

/**
 * Strip HTML tags and decode common entities. Use when an `Event.description`
 * may contain HTML (it falls back to `content` when `introduction` is empty).
 *
 * Not a sanitizer — for `innerHTML` rendering, use a real sanitizer like
 * DOMPurify. Use this only when the destination is plain text.
 */
export function stripHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
