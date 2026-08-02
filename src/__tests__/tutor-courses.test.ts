import { beforeEach, describe, expect, it, vi } from "vitest";
import { FavCRM } from "../client.js";
import { modulesToFeatures } from "../modules.js";

function envelope<T>(data: T) {
  return { success: true, data };
}

function mockFetch(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(envelope(data)),
  });
}

describe("TutorCoursesClient", () => {
  let sdk: FavCRM;

  beforeEach(() => {
    sdk = new FavCRM({
      baseUrl: "https://api.test.com",
      companyId: "tenant-123",
    });
  });

  it("lists courses through the tenant-scoped customer portal path", async () => {
    const fetch = mockFetch({ courses: [] });
    vi.stubGlobal("fetch", fetch);

    await sdk.tutorCourses.list();

    expect(fetch).toHaveBeenCalledWith(
      "https://api.test.com/v6/customer-portal/tutor-courses",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "X-Company-Id": "tenant-123" }),
      }),
    );
  });

  it("posts enrollment and returns the server payment decision", async () => {
    const fetch = mockFetch({
      enrollment: { id: "enrollment-1" },
      eligibleOccurrenceIds: ["occurrence-1"],
      paymentPending: true,
    });
    vi.stubGlobal("fetch", fetch);

    const result = await sdk.tutorCourses.enroll("course-1", {
      sectionId: "section-1",
    });

    expect(result.paymentPending).toBe(true);
    expect(fetch.mock.calls[0][0]).toBe(
      "https://api.test.com/v6/customer-portal/tutor-courses/course-1/enrollments",
    );
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      sectionId: "section-1",
    });
  });

  it("builds leave, transfer, and payment-status routes", async () => {
    const fetch = mockFetch({ requests: [] });
    vi.stubGlobal("fetch", fetch);

    await sdk.tutorCourses.listLeaveRequests("enrollment-1");
    await sdk.tutorCourses.requestLeave("enrollment-1", {
      occurrenceIds: ["occurrence-1"],
      reason: "Travel",
    });
    await sdk.tutorCourses.listTransferRequests("enrollment-1");
    await sdk.tutorCourses.requestTransfer("enrollment-1", {
      destinationSectionId: "section-2",
    });
    await sdk.tutorCourses.getPaymentStatus("enrollment-1", "transaction-1");

    const urls = fetch.mock.calls.map((call) => call[0]);
    expect(urls).toContain(
      "https://api.test.com/v6/customer-portal/tutor-courses/my-enrollments/enrollment-1/leave-requests",
    );
    expect(urls).toContain(
      "https://api.test.com/v6/customer-portal/tutor-courses/my-enrollments/enrollment-1/transfer-requests",
    );
    expect(urls).toContain(
      "https://api.test.com/v6/customer-portal/tutor-courses/my-enrollments/enrollment-1/payment-status?transactionId=transaction-1",
    );
  });
});

describe("tutor course feature mapping", () => {
  it("does not enable tutor courses unless the module is present", () => {
    expect(modulesToFeatures(["events"]).has("tutorCourses")).toBe(false);
    expect(modulesToFeatures(["tutor_courses"]).has("tutorCourses")).toBe(true);
  });
});
