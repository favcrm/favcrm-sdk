import { describe, it, expect } from "vitest";
import {
  mapApiEvent,
  getAvailableEventDates,
  getPrimaryEventDate,
  isEventBookable,
  getMaxOrderQuantity,
  sortEventsForDisplay,
  formatEventPrice,
  formatEventDate,
  getDeliveryModeLabel,
  getEventAvailabilityLabel,
  stripHtml,
} from "../events.js";
import type { ApiEvent, Event, EventDate } from "../types/event.js";

function makeApiEvent(overrides: Partial<ApiEvent> = {}): ApiEvent {
  return {
    id: "evt-1",
    slug: "test-event",
    title: "Test Event",
    price: 100,
    currency: "HKD",
    status: "published",
    venue: "Room A",
    dates: [
      {
        id: "d1",
        startTime: "2099-01-01T10:00:00Z",
        endTime: "2099-01-01T12:00:00Z",
      },
    ],
    ...overrides,
  };
}

describe("mapApiEvent", () => {
  it("maps basic fields correctly", () => {
    const result = mapApiEvent(makeApiEvent());
    expect(result.id).toBe("evt-1");
    expect(result.slug).toBe("test-event");
    expect(result.title).toBe("Test Event");
    expect(result.price).toBe(100);
    expect(result.currency).toBe("HKD");
    expect(result.isFree).toBe(false);
    expect(result.location).toBe("Room A");
  });

  it("marks free events", () => {
    const result = mapApiEvent(makeApiEvent({ price: 0 }));
    expect(result.isFree).toBe(true);
  });

  it("uses introduction as description", () => {
    const result = mapApiEvent(makeApiEvent({ introduction: "Intro text" }));
    expect(result.description).toBe("Intro text");
  });

  it("falls back to content when no introduction", () => {
    const result = mapApiEvent(
      makeApiEvent({ introduction: null, content: "Content text" }),
    );
    expect(result.description).toBe("Content text");
  });

  it("returns empty description when neither introduction nor content", () => {
    const result = mapApiEvent(
      makeApiEvent({ introduction: null, content: null }),
    );
    expect(result.description).toBe("");
  });

  it("maps dates array", () => {
    const result = mapApiEvent(
      makeApiEvent({
        dates: [
          {
            id: "d1",
            startTime: "2099-01-01T10:00:00Z",
            endTime: "2099-01-01T12:00:00Z",
            allDay: true,
            remainingQuota: 5,
          },
          { startTime: "2099-01-02T10:00:00Z" },
        ],
      }),
    );
    expect(result.dates).toHaveLength(2);
    expect(result.dates[0]).toEqual({
      id: "d1",
      startTime: "2099-01-01T10:00:00Z",
      endTime: "2099-01-01T12:00:00Z",
      allDay: true,
      remainingQuota: 5,
      isExpired: false,
      isFull: false,
      available: true,
    });
    expect(result.dates[1]).toEqual({
      id: null,
      startTime: "2099-01-02T10:00:00Z",
      endTime: null,
      allDay: false,
      remainingQuota: null,
      isExpired: false,
      isFull: false,
      // sessions without an id can't be booked — force unavailable
      available: false,
    });
  });

  it("extracts startDate and endDate from first date entry", () => {
    const result = mapApiEvent(makeApiEvent());
    expect(result.startDate).toBe("2099-01-01T10:00:00Z");
    expect(result.endDate).toBe("2099-01-01T12:00:00Z");
  });

  it("uses the first available date for display dates", () => {
    const result = mapApiEvent(
      makeApiEvent({
        dates: [
          {
            id: "past",
            startTime: "2020-01-01T10:00:00Z",
            endTime: "2020-01-01T12:00:00Z",
          },
          {
            id: "future",
            startTime: "2099-02-01T10:00:00Z",
            endTime: "2099-02-01T12:00:00Z",
          },
        ],
      }),
    );
    expect(result.startDate).toBe("2099-02-01T10:00:00Z");
    expect(result.endDate).toBe("2099-02-01T12:00:00Z");
  });

  it("handles empty dates array", () => {
    const result = mapApiEvent(makeApiEvent({ dates: [] }));
    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
    expect(result.dates).toEqual([]);
  });

  it("maps cancelled status", () => {
    const result = mapApiEvent(makeApiEvent({ status: "Cancelled" }));
    expect(result.status).toBe("cancelled");
  });

  it("derives upcoming status for future published events", () => {
    const result = mapApiEvent(makeApiEvent({ status: "Published" }));
    expect(result.status).toBe("upcoming");
  });

  it("keeps published status when there are no dates", () => {
    const result = mapApiEvent(makeApiEvent({ status: "Published", dates: [] }));
    expect(result.status).toBe("published");
  });

  it("detects past events from dates", () => {
    const result = mapApiEvent(
      makeApiEvent({
        status: "active",
        dates: [
          {
            startTime: "2020-01-01T10:00:00Z",
            endTime: "2020-01-01T12:00:00Z",
          },
        ],
      }),
    );
    expect(result.status).toBe("past");
  });

  it("does not mark an event past when a later session is still available", () => {
    const result = mapApiEvent(
      makeApiEvent({
        status: "Published",
        dates: [
          {
            id: "past",
            startTime: "2020-01-01T10:00:00Z",
            endTime: "2020-01-01T12:00:00Z",
          },
          {
            id: "future",
            startTime: "2099-01-01T10:00:00Z",
            endTime: "2099-01-01T12:00:00Z",
            remainingQuota: 100,
          },
        ],
      }),
    );
    expect(result.status).toBe("upcoming");
    expect(getAvailableEventDates(result).map((date) => date.id)).toEqual([
      "future",
    ]);
    expect(isEventBookable(result)).toBe(true);
  });

  it("trusts API ongoing status for events with mixed sessions", () => {
    const result = mapApiEvent(
      makeApiEvent({
        status: "ongoing",
        dates: [
          {
            id: "past",
            startTime: "2020-01-01T10:00:00Z",
            endTime: "2020-01-01T12:00:00Z",
          },
          {
            id: "future",
            startTime: "2099-01-01T10:00:00Z",
            endTime: "2099-01-01T12:00:00Z",
            remainingQuota: 100,
          },
        ],
      }),
    );
    expect(result.status).toBe("ongoing");
    expect(isEventBookable(result)).toBe(true);
  });

  it("corrects stale API past status when a later session is available", () => {
    const result = mapApiEvent(
      makeApiEvent({
        status: "past",
        dates: [
          {
            id: "past",
            startTime: "2020-01-01T10:00:00Z",
            endTime: "2020-01-01T12:00:00Z",
          },
          {
            id: "future",
            startTime: "2099-01-01T10:00:00Z",
            endTime: "2099-01-01T12:00:00Z",
            remainingQuota: 100,
          },
        ],
      }),
    );
    expect(result.status).toBe("upcoming");
    expect(isEventBookable(result)).toBe(true);
  });

  it("detects ongoing events", () => {
    const now = new Date();
    const past = new Date(now.getTime() - 3600_000).toISOString();
    const future = new Date(now.getTime() + 3600_000).toISOString();
    const result = mapApiEvent(
      makeApiEvent({
        status: "active",
        dates: [{ startTime: past, endTime: future }],
      }),
    );
    expect(result.status).toBe("ongoing");
  });

  it("defaults to upcoming for future events", () => {
    const result = mapApiEvent(makeApiEvent({ status: "active" }));
    expect(result.status).toBe("upcoming");
  });

  it("handles null image and venue", () => {
    const result = mapApiEvent(makeApiEvent({ image: null, venue: null }));
    expect(result.imageUrl).toBeNull();
    expect(result.location).toBeNull();
  });

  it("maps image URL", () => {
    const result = mapApiEvent(
      makeApiEvent({ image: "https://img.test/photo.jpg" }),
    );
    expect(result.imageUrl).toBe("https://img.test/photo.jpg");
  });

  it("uses API availability flags when present", () => {
    const result = mapApiEvent(
      makeApiEvent({
        dates: [
          {
            id: "d1",
            startTime: "2099-01-01T10:00:00Z",
            endTime: "2099-01-01T12:00:00Z",
            remainingQuota: null,
            isExpired: true,
            isFull: false,
            available: false,
          },
        ],
      }),
    );

    expect(result.dates[0]).toMatchObject({
      remainingQuota: null,
      isExpired: true,
      isFull: false,
      available: false,
    });
  });

  it("always sets remainingQuota to null", () => {
    const result = mapApiEvent(makeApiEvent());
    expect(result.remainingQuota).toBeNull();
  });

  it("maps ticket limits and delivery mode", () => {
    const result = mapApiEvent(
      makeApiEvent({
        maxTicketsPerOrder: 4,
        maxTicketsPerMember: 6,
        deliveryMode: "online",
      }),
    );
    expect(result.maxTicketsPerOrder).toBe(4);
    expect(result.maxTicketsPerMember).toBe(6);
    expect(result.deliveryMode).toBe("online");
  });

  it("forces available=false when API claims available but session has no id", () => {
    const result = mapApiEvent(
      makeApiEvent({
        dates: [
          { startTime: "2099-01-01T10:00:00Z", available: true },
        ],
      }),
    );
    expect(result.dates[0].available).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

function makeEvent(): Event {
  return mapApiEvent({
    id: "evt-1",
    slug: "test-event",
    title: "Test Event",
    price: 100,
    currency: "HKD",
    status: "published",
    venue: "Room A",
    dates: [
      {
        id: "d1",
        startTime: "2099-01-01T10:00:00Z",
        endTime: "2099-01-01T12:00:00Z",
      },
    ],
  });
}

function makeDate(overrides: Partial<EventDate> = {}): EventDate {
  return {
    id: "d1",
    startTime: "2099-01-01T10:00:00Z",
    endTime: "2099-01-01T12:00:00Z",
    allDay: false,
    remainingQuota: null,
    isExpired: false,
    isFull: false,
    available: true,
    ...overrides,
  };
}

describe("getAvailableEventDates", () => {
  it("filters to bookable sessions with id", () => {
    const event = makeEvent();
    event.dates = [
      makeDate({ id: "a" }),
      makeDate({ id: "b", isFull: true }),
      makeDate({ id: "c", isExpired: true }),
      makeDate({ id: "d", available: false }),
      makeDate({ id: null }),
    ];
    const result = getAvailableEventDates(event);
    expect(result.map((d) => d.id)).toEqual(["a"]);
  });
});

describe("getPrimaryEventDate", () => {
  it("returns first available date when present", () => {
    const event = makeEvent();
    event.dates = [
      makeDate({ id: "a", isFull: true }),
      makeDate({ id: "b" }),
    ];
    expect(getPrimaryEventDate(event)?.id).toBe("b");
  });

  it("falls back to first date when none available", () => {
    const event = makeEvent();
    event.dates = [makeDate({ id: "a", isFull: true })];
    expect(getPrimaryEventDate(event)?.id).toBe("a");
  });

  it("returns null when no dates", () => {
    const event = makeEvent();
    event.dates = [];
    expect(getPrimaryEventDate(event)).toBeNull();
  });
});

describe("isEventBookable", () => {
  it("false when cancelled", () => {
    const event = makeEvent();
    event.status = "cancelled";
    expect(isEventBookable(event)).toBe(false);
  });

  it("false when past", () => {
    const event = makeEvent();
    event.status = "past";
    event.dates = [makeDate({ isExpired: true, available: false })];
    expect(isEventBookable(event)).toBe(false);
  });

  it("true for stale past status when a session is still bookable", () => {
    const event = makeEvent();
    event.status = "past";
    event.dates = [makeDate({ id: "future", remainingQuota: 5 })];
    expect(isEventBookable(event)).toBe(true);
  });

  it("false when no available dates", () => {
    const event = makeEvent();
    event.dates = [makeDate({ isFull: true })];
    expect(isEventBookable(event)).toBe(false);
  });

  it("true when at least one date is bookable", () => {
    expect(isEventBookable(makeEvent())).toBe(true);
  });
});

describe("getMaxOrderQuantity", () => {
  it("clamps to event maxTicketsPerOrder when no remaining quota", () => {
    const event = makeEvent();
    event.maxTicketsPerOrder = 5;
    expect(getMaxOrderQuantity(event, makeDate({ remainingQuota: null }))).toBe(5);
  });

  it("clamps to remaining quota when smaller than cap", () => {
    const event = makeEvent();
    event.maxTicketsPerOrder = 10;
    expect(getMaxOrderQuantity(event, makeDate({ remainingQuota: 3 }))).toBe(3);
  });

  it("clamps to cap when remaining quota is larger", () => {
    const event = makeEvent();
    event.maxTicketsPerOrder = 4;
    expect(getMaxOrderQuantity(event, makeDate({ remainingQuota: 99 }))).toBe(4);
  });

  it("falls back to cap for null date", () => {
    const event = makeEvent();
    event.maxTicketsPerOrder = 6;
    expect(getMaxOrderQuantity(event, null)).toBe(6);
  });

  it("returns at least 1", () => {
    const event = makeEvent();
    event.maxTicketsPerOrder = 0;
    expect(getMaxOrderQuantity(event, null)).toBe(1);
  });
});

describe("sortEventsForDisplay", () => {
  it("sorts events by primary date ascending", () => {
    const a = makeEvent();
    a.id = "a";
    a.dates = [makeDate({ id: "x", startTime: "2099-03-01T10:00:00Z" })];
    const b = makeEvent();
    b.id = "b";
    b.dates = [makeDate({ id: "y", startTime: "2099-01-01T10:00:00Z" })];
    const c = makeEvent();
    c.id = "c";
    c.dates = [makeDate({ id: "z", startTime: "2099-02-01T10:00:00Z" })];
    const sorted = sortEventsForDisplay([a, b, c]);
    expect(sorted.map((e) => e.id)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate input", () => {
    const input = [makeEvent(), makeEvent()];
    const snapshot = [...input];
    sortEventsForDisplay(input);
    expect(input).toEqual(snapshot);
  });
});

describe("formatEventPrice", () => {
  it("returns Free for zero price", () => {
    const event = makeEvent();
    event.price = 0;
    event.isFree = true;
    expect(formatEventPrice(event)).toBe("Free");
  });

  it("uses event currency", () => {
    const event = makeEvent();
    event.price = 100;
    event.currency = "USD";
    expect(formatEventPrice(event, { locale: "en-US" })).toContain("100");
    expect(formatEventPrice(event, { locale: "en-US" })).toContain("$");
  });

  it("supports custom free label", () => {
    const event = makeEvent();
    event.isFree = true;
    expect(formatEventPrice(event, { freeLabel: "免費" })).toBe("免費");
  });
});

describe("formatEventDate", () => {
  it("returns TBA for null", () => {
    expect(formatEventDate(null)).toBe("TBA");
  });

  it("supports custom fallback", () => {
    expect(formatEventDate(null, { fallbackLabel: "日期待定" })).toBe(
      "日期待定",
    );
  });

  it("appends timezoneLabel suffix", () => {
    const out = formatEventDate(makeDate(), { timezoneLabel: "HKT" });
    expect(out).toMatch(/HKT$/);
  });

  it("formats all-day without time", () => {
    const out = formatEventDate(
      makeDate({ allDay: true, endTime: null }),
      { locale: "en-US", timeZone: "UTC" },
    );
    expect(out).not.toMatch(/\d{2}:\d{2}/);
  });
});

describe("getDeliveryModeLabel", () => {
  it("maps each mode", () => {
    expect(getDeliveryModeLabel("online")).toBe("Online");
    expect(getDeliveryModeLabel("hybrid")).toBe("Online & in-person");
    expect(getDeliveryModeLabel("in_person")).toBe("In-person");
  });
});

describe("getEventAvailabilityLabel", () => {
  it("returns Cancelled for cancelled events", () => {
    const event = makeEvent();
    event.status = "cancelled";
    expect(getEventAvailabilityLabel(event)).toBe("Cancelled");
  });

  it("returns Ended for past events", () => {
    const event = makeEvent();
    event.status = "past";
    event.dates = [makeDate({ isExpired: true, available: false })];
    expect(getEventAvailabilityLabel(event)).toBe("Ended");
  });

  it("returns Sold out when nothing bookable", () => {
    const event = makeEvent();
    event.dates = [makeDate({ isFull: true })];
    expect(getEventAvailabilityLabel(event)).toBe("Sold out");
  });

  it("returns Open when bookable", () => {
    expect(getEventAvailabilityLabel(makeEvent())).toBe("Open");
  });

  it("supports custom labels", () => {
    const event = makeEvent();
    event.status = "cancelled";
    expect(
      getEventAvailabilityLabel(event, { cancelled: "已取消" }),
    ).toBe("已取消");
  });
});

describe("stripHtml", () => {
  it("returns empty string for null/undefined", () => {
    expect(stripHtml(null)).toBe("");
    expect(stripHtml(undefined)).toBe("");
    expect(stripHtml("")).toBe("");
  });

  it("removes tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("strips style and script blocks", () => {
    expect(
      stripHtml("<style>.x{color:red}</style><p>Hi</p><script>alert(1)</script>"),
    ).toBe("Hi");
  });

  it("decodes common entities", () => {
    expect(stripHtml("Tom &amp; Jerry &nbsp; &#39;quoted&#39;")).toBe(
      "Tom & Jerry 'quoted'",
    );
  });

  it("collapses whitespace", () => {
    expect(stripHtml("<p>Line 1</p>\n  <p>Line 2</p>")).toBe("Line 1 Line 2");
  });
});
