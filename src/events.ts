import type { ApiEvent, Event } from './types/event.js';

/** Map raw v6 API event to the normalized Event shape. */
export function mapApiEvent(raw: ApiEvent): Event {
  const firstDate = raw.dates?.[0] ?? null;
  const startDate = firstDate?.startTime ?? null;
  const endDate = firstDate?.endTime ?? null;

  const statusLower = raw.status.toLowerCase();
  let status: Event["status"];
  if (statusLower === "cancelled") {
    status = "cancelled";
  } else if (statusLower === "published") {
    status = "published";
  } else if (startDate && new Date(startDate) < new Date()) {
    status = endDate && new Date(endDate) > new Date() ? "ongoing" : "past";
  } else {
    status = "upcoming";
  }

  const quota = raw.quota ? parseInt(raw.quota, 10) : null;

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
    })),
    location: raw.venue || null,
    price: raw.price,
    currency: raw.currency,
    isFree: raw.price === 0,
    capacity: isNaN(quota as number) ? null : quota,
    remainingQuota: null,
    status,
  };
}
