import { describe, it, expect, vi } from "vitest";
import { mapApiEvent } from "../events.js";
import type { ApiEvent } from "../types/event.js";

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
      available: true,
    });
  });

  it("extracts startDate and endDate from first date entry", () => {
    const result = mapApiEvent(makeApiEvent());
    expect(result.startDate).toBe("2099-01-01T10:00:00Z");
    expect(result.endDate).toBe("2099-01-01T12:00:00Z");
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
});
