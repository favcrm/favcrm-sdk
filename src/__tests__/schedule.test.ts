import { describe, it, expect } from "vitest";
import {
  scheduleSlotParam,
  extractScheduleOfferings,
  filterScheduleDays,
  buildScheduleGrid,
  countScheduleSessions,
} from "../bookings.js";
import type {
  VenueScheduleDay,
  VenueScheduleSession,
} from "../types/booking.js";

function session(
  over: Partial<VenueScheduleSession> & Pick<VenueScheduleSession, "offeringId" | "offeringName" | "start">,
): VenueScheduleSession {
  return {
    offeringType: "service",
    scheduleId: null,
    sessionId: null,
    end: null,
    available: true,
    durationMinutes: null,
    ...over,
  };
}

const days: VenueScheduleDay[] = [
  {
    date: "2026-06-01",
    weekday: "Mon",
    bookable: true,
    sessions: [
      session({ offeringId: "yoga", offeringName: "Yoga", start: "2026-06-01 09:00" }),
      session({ offeringId: "spin", offeringName: "Spin", start: "2026-06-01 09:00" }),
      session({ offeringId: "yoga", offeringName: "Yoga", start: "2026-06-01 18:00", available: false }),
    ],
  },
  {
    date: "2026-06-02",
    weekday: "Tue",
    bookable: true,
    sessions: [
      session({ offeringId: "spin", offeringName: "Spin", start: "2026-06-02 07:30" }),
    ],
  },
];

describe("scheduleSlotParam", () => {
  it("extracts HH:MM from a service start string", () => {
    expect(scheduleSlotParam("2026-06-01 09:00")).toBe("09:00");
  });

  it("extracts HH:MM from an ISO-like datetime", () => {
    expect(scheduleSlotParam("2026-06-01T18:30:00")).toBe("18:30");
  });

  it("returns the input unchanged when no time is present", () => {
    expect(scheduleSlotParam("nope")).toBe("nope");
  });
});

describe("extractScheduleOfferings", () => {
  it("returns distinct offerings in first-seen order", () => {
    expect(extractScheduleOfferings(days)).toEqual([
      { offeringId: "yoga", name: "Yoga" },
      { offeringId: "spin", name: "Spin" },
    ]);
  });

  it("is empty for no days", () => {
    expect(extractScheduleOfferings([])).toEqual([]);
  });
});

describe("filterScheduleDays", () => {
  it("returns days unchanged for a null filter", () => {
    expect(filterScheduleDays(days, null)).toBe(days);
  });

  it("narrows each day to the chosen offering", () => {
    const out = filterScheduleDays(days, "spin");
    expect(out[0].sessions).toHaveLength(1);
    expect(out[0].sessions[0].offeringId).toBe("spin");
    expect(out[1].sessions).toHaveLength(1);
  });

  it("yields empty session lists when the offering is absent that day", () => {
    const out = filterScheduleDays(days, "yoga");
    expect(out[1].sessions).toHaveLength(0);
  });
});

describe("buildScheduleGrid", () => {
  it("produces sorted distinct row times", () => {
    expect(buildScheduleGrid(days).rows).toEqual(["07:30", "09:00", "18:00"]);
  });

  it("buckets multiple sessions sharing a cell", () => {
    const { index } = buildScheduleGrid(days);
    expect(index.get("2026-06-01|09:00")).toHaveLength(2);
    expect(index.get("2026-06-02|07:30")).toHaveLength(1);
    expect(index.get("2026-06-01|12:00")).toBeUndefined();
  });

  it("is empty for no days", () => {
    const grid = buildScheduleGrid([]);
    expect(grid.rows).toEqual([]);
    expect(grid.index.size).toBe(0);
  });
});

describe("countScheduleSessions", () => {
  it("sums sessions across days", () => {
    expect(countScheduleSessions(days)).toBe(4);
  });

  it("is zero for no days", () => {
    expect(countScheduleSessions([])).toBe(0);
  });
});
