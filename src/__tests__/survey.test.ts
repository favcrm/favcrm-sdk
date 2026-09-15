import { describe, expect, it, vi } from "vitest";
import { FavCRM } from "../client.js";
import type {
  SurveyAttributionTouch,
  SurveyResponseAttribution,
  SurveyResponseResult,
  SurveyResponseSubmission,
} from "../types/survey.js";

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

function envelope<T>(data: T) {
  return { success: true, data };
}

const firstTouch: SurveyAttributionTouch = {
  utmSource: "newsletter",
  utmMedium: "email",
  utmCampaign: "spring",
  utmContent: "hero",
  clickIds: { google: "g-123" },
  landingUrl: "https://portal.example.com/t/surveys/x?utm_source=newsletter",
  capturedAt: "2026-09-10T08:00:00.000Z",
  capturedVia: "hosted_form",
};

const attribution: SurveyResponseAttribution = {
  schemaVersion: 1,
  firstTouch,
  submissionTouch: {
    utmSource: "newsletter",
    capturedAt: "2026-09-10T08:05:00.000Z",
    capturedVia: "hosted_form",
  },
  sessionId: "browser-session-1",
  placement: { pagePath: "/t/surveys/x", form: "hosted" },
};

describe("survey response contract", () => {
  it("serializes a keyed submission with attribution metadata unchanged", async () => {
    const result = envelope<SurveyResponseResult>({
      id: "resp-1",
      duplicate: false,
      status: "partial",
      resumeToken: "t".repeat(64),
    });
    const fetch = mockFetch(result);
    vi.stubGlobal("fetch", fetch);
    const sdk = new FavCRM({ baseUrl: "https://api.test.com", companyId: "company-1" });

    const submission: SurveyResponseSubmission = {
      answers: { q1: "great" },
      status: "partial",
      sessionId: "browser-session-1",
      submissionKey: "key-abcd-1234",
      metadata: { attribution, campaignTag: "custom" },
    };
    const response = await sdk.surveys.submit("survey-1", submission);

    const body = JSON.parse(fetch.mock.calls[0][1].body as string);
    expect(body).toEqual({
      answers: { q1: "great" },
      status: "partial",
      sessionId: "browser-session-1",
      submissionKey: "key-abcd-1234",
      metadata: { attribution, campaignTag: "custom" },
    });
    expect(response).toEqual({
      id: "resp-1",
      duplicate: false,
      status: "partial",
      resumeToken: "t".repeat(64),
    });
  });

  it("serializes a resume-by-responseId payload through submitByToken", async () => {
    const fetch = mockFetch(
      envelope<SurveyResponseResult>({ id: "resp-9", duplicate: false, status: "completed" }),
    );
    vi.stubGlobal("fetch", fetch);
    const sdk = new FavCRM({ baseUrl: "https://api.test.com", companyId: "company-1" });

    const submission: SurveyResponseSubmission = {
      answers: { q1: "done" },
      status: "completed",
      responseId: "resp-9",
      resumeToken: "r".repeat(64),
    };
    await sdk.surveys.submitByToken("invite-token", submission);

    expect(fetch.mock.calls[0][0]).toBe(
      "https://api.test.com/v6/customer-portal/surveys/token/invite-token/responses",
    );
    const body = JSON.parse(fetch.mock.calls[0][1].body as string);
    expect(body).toEqual({
      answers: { q1: "done" },
      status: "completed",
      responseId: "resp-9",
      resumeToken: "r".repeat(64),
    });
  });

  it("legacy unkeyed submissions stay wire-identical", async () => {
    const fetch = mockFetch(envelope<SurveyResponseResult>({ id: "resp-2", duplicate: false }));
    vi.stubGlobal("fetch", fetch);
    const sdk = new FavCRM({ baseUrl: "https://api.test.com", companyId: "company-1" });

    const legacy: SurveyResponseSubmission = {
      answers: { q1: "a" },
      respondentEmail: "member@example.com",
      startedAt: "2026-09-10T08:00:00.000Z",
      timeSpentSeconds: 42,
    };
    await sdk.surveys.submit("survey-1", legacy);
    const body = JSON.parse(fetch.mock.calls[0][1].body as string);
    expect(body).toEqual({
      answers: { q1: "a" },
      respondentEmail: "member@example.com",
      startedAt: "2026-09-10T08:00:00.000Z",
      timeSpentSeconds: 42,
    });
    expect("submissionKey" in body).toBe(false);
  });

  it("the attribution fixture satisfies the provider contract", () => {
    // Mirrors api docs/survey-response-attribution-v1.md fixtures — kept in
    // lockstep so provider validation and SDK typing never drift.
    expect(attribution.schemaVersion).toBe(1);
    expect(attribution.firstTouch?.capturedVia).toBe("hosted_form");
    expect(Object.keys(attribution.submissionTouch ?? {})).not.toContain("clickIds");
  });
});
