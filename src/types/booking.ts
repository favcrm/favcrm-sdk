export interface BookingService {
  id: string;
  name: string;
  description: string | null;
  type: string;
  durationMinutes: number;
  capacity: number;
  price: string;
  currency: string;
  coverImage: string | null;
  requiresStaff: boolean;
  requiresResource: boolean;
  paymentRequired: boolean;
  requiresConfirmation: boolean;
  requireLogin: boolean;
  advanceBookingDays: number | null;
  categoryId: string | null;
  categoryName: string | null;
}

export type BookingStatus = "draft" | "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

export interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  status: BookingStatus;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalPrice: string;
  currency: string;
  createdAt: string;
}

export interface BookingLineItem {
  id: string;
  type: string;
  name: string;
  description: string | null;
  price: string;
  memberTierPrice: string | null;
  durationMinutes: number;
  occurrenceStart: string | null;
  occurrenceEnd: string | null;
}

export interface BookingStatusChange {
  fromStatus: string | null;
  toStatus: string;
  createdAt: string;
}

export interface BookingDetail extends Booking {
  subtotal: string;
  addonsTotal: string;
  discountAmount: string | null;
  promotionCode: string | null;
  totalDurationMinutes: number;
  notes: string | null;
  cancellationReason: string | null;
  lineItems: BookingLineItem[];
  statusHistory: BookingStatusChange[];
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  remainingCapacity: number;
  scheduleId?: string;
  quoteId?: string;
  basePrice?: string;
  tierPrice?: string;
  tierName?: string | null;
  priceType?: string;
}

export interface BookingConfig {
  advanceBookingDays: number | null;
  isAllowed: boolean;
  dailyBookingCount: number | null;
  weeklyBookingCount: number | null;
  weeklyHoursLimit: number | null;
  currentDailyUsage: number;
  currentWeeklyUsage: number;
}
