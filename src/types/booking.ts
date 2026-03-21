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
  categoryId: string | null;
  categoryName: string | null;
}

export type BookingStatus = "draft" | "confirmed" | "cancelled" | "completed";

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
