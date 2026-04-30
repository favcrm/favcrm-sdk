import type { ApiEvent, Event } from "./types/event.js";

function getCloseDate(
  startDate: string | null,
  endDate: string | null,
): Date | null {
  const value = endDate || startDate;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Map raw v6 API event to the normalized Event shape. */
export function mapApiEvent(raw: ApiEvent): Event {
  const firstDate = raw.dates?.[0] ?? null;
  const startDate = firstDate?.startTime ?? null;
  const endDate = firstDate?.endTime ?? null;

  const statusLower = raw.status.toLowerCase();
  let status: Event["status"];
  if (statusLower === "cancelled") {
    status = "cancelled";
  } else if (startDate) {
    const start = new Date(startDate);
    const close = getCloseDate(startDate, endDate);
    const now = Date.now();
    if (
      !Number.isNaN(start.getTime()) &&
      start.getTime() <= now &&
      close &&
      close.getTime() > now
    ) {
      status = "ongoing";
    } else if (close && close.getTime() <= now) {
      status = "past";
    } else {
      status = "upcoming";
    }
  } else if (statusLower === "published") {
    status = "published";
  } else {
    status = "upcoming";
  }

  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    description: raw.introduction || raw.content || "",
    imageUrl: raw.image || null,
    startDate,
    endDate,
    dates: (raw.dates || []).map((d) => ({
      id: d.id ?? null,
      startTime: d.startTime,
      endTime: d.endTime ?? null,
      allDay: d.allDay ?? false,
      remainingQuota: d.remainingQuota ?? null,
      isExpired:
        d.isExpired ??
        ((getCloseDate(d.startTime, d.endTime ?? null)?.getTime() ??
          Infinity) <= Date.now()),
      isFull:
        d.isFull ??
        (d.remainingQuota !== undefined &&
          d.remainingQuota !== null &&
          d.remainingQuota <= 0),
      available:
        d.available ??
        !(
          (getCloseDate(d.startTime, d.endTime ?? null)?.getTime() ??
            Infinity) <= Date.now() ||
          (d.remainingQuota !== undefined &&
            d.remainingQuota !== null &&
            d.remainingQuota <= 0)
        ),
    })),
    location: raw.venue || null,
    price: raw.price,
    currency: raw.currency,
    isFree: raw.price === 0,
    remainingQuota: null,
    status,
  };
}
