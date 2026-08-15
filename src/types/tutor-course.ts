export type TutorCourseStatus =
  | "draft"
  | "published"
  | "paused"
  | "completed"
  | "archived";

export type TutorCourseOccurrenceStatus =
  | "scheduled"
  | "cancelled"
  | "completed";

export type TutorCourseEnrollmentStatus =
  | "pending_payment"
  | "active"
  | "on_leave"
  | "transferred"
  | "completed"
  | "cancelled"
  | "past_due";

export type TutorCoursePaymentStatus =
  | "not_required"
  | "pending"
  | "confirmed"
  | "failed";

export type TutorCourseEnrollmentSegmentStatus = "active" | "closed";

export type TutorCourseLeaveRequestStatus =
  | "requested"
  | "approved"
  | "declined"
  | "cancelled"
  | "expired";

export type TutorCourseTransferRequestStatus = TutorCourseLeaveRequestStatus;

export interface TutorCourseSummary {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  status: TutorCourseStatus;
  level: string | null;
  coverImageUrl: string | null;
  startsOn: string | null;
  endsOn: string | null;
}

export interface TutorCourseOccurrence {
  id: string;
  sectionId: string;
  originalOccurrenceKey: string;
  startsAt: string;
  endsAt: string;
  status: TutorCourseOccurrenceStatus;
  cancellationReason: string | null;
}

export interface TutorCourseSection {
  id: string;
  courseId: string;
  name: string;
  location: string | null;
  timezone: string;
  startsOn: string;
  endsOn: string;
  capacity: number;
  price: string;
  currency: string;
  allowMidCourseEnrollment: boolean;
  leaveNoticeHours: number;
  occurrences: TutorCourseOccurrence[];
}

export interface TutorCourseDetail extends TutorCourseSummary {
  sections: TutorCourseSection[];
}

export interface TutorCourseEnrollment {
  id: string;
  courseId: string;
  companyId: string;
  learnerAccountId: string;
  payerAccountId: string;
  status: TutorCourseEnrollmentStatus;
  paymentStatus: TutorCoursePaymentStatus;
  initialChargeAmount: string;
  currency: string;
  invoiceId: string | null;
  enrolledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TutorCourseEnrollmentSegmentSection {
  id: string;
  name: string;
  location: string | null;
  timezone: string;
}

export interface TutorCourseEnrollmentSegment {
  id: string;
  sectionId: string;
  effectiveFromOccurrenceId: string;
  effectiveUntilOccurrenceId: string | null;
  status: TutorCourseEnrollmentSegmentStatus;
  section: TutorCourseEnrollmentSegmentSection;
  occurrences: TutorCourseOccurrence[];
}

export interface TutorCourseMyEnrollment {
  enrollment: TutorCourseEnrollment;
  course: TutorCourseSummary;
  isLearner: boolean;
  segments: TutorCourseEnrollmentSegment[];
}

export interface TutorCourseEnrollmentResult {
  enrollment: TutorCourseEnrollment;
  eligibleOccurrenceIds: string[];
  paymentPending: boolean;
  paymentHoldExpiresAt: string | null;
}

export interface TutorCourseEnrollmentPreview {
  enrollable: boolean;
  reason: string | null;
  eligibleOccurrenceIds: string[];
  eligibleOccurrenceCount: number;
  initialChargeAmount: string | null;
  currency: string | null;
  seatsRemaining: number | null;
  paymentHoldExpiresAt: string | null;
}

export type TutorCourseCheckoutStatus =
  | "pending"
  | "processing"
  | "redirected"
  | "expired"
  | "completed"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partial_refund";

export interface TutorCoursePaymentInput {
  successUrl: string;
  cancelUrl: string;
  paymentMethodId?: string;
}

export interface TutorCoursePaymentSession {
  mode: "gateway";
  paymentUrl: string;
  transactionId: string;
  sessionId: string;
  gatewayType: string;
  expiresAt?: string;
}

export interface TutorCoursePaymentStatusResult {
  enrollmentStatus: TutorCourseEnrollmentStatus;
  paymentStatus: TutorCourseCheckoutStatus | TutorCoursePaymentStatus;
  paidAt: string | null;
  transactionId: string | null;
  changed: boolean;
}

export interface TutorCourseLeaveRequest {
  id: string;
  enrollmentId: string;
  segmentId: string;
  companyId: string;
  status: TutorCourseLeaveRequestStatus;
  reason: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedByMemberId: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  occurrenceIds: string[];
}

export interface TutorCourseLeaveRequestInput {
  occurrenceIds: string[];
  reason?: string | null;
}

export interface TutorCourseTransferRequest {
  id: string;
  enrollmentId: string;
  fromSegmentId: string;
  toSectionId: string;
  effectiveOccurrenceId: string;
  companyId: string;
  status: TutorCourseTransferRequestStatus;
  reason: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedByMemberId: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TutorCourseTransferRequestInput {
  destinationSectionId: string;
  reason?: string | null;
}
