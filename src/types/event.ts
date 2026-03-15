export interface EventListItem {
  id: number;
  slug: string;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  ticketPrice: number;
  status: string;
  capacity: number;
  imageUrl?: string;
}

export interface EventDetail extends EventListItem {
  description: string;
  sessions: EventSession[];
}

export interface EventSession {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  availableSlots: number;
}

export interface EventRegistrationSubmission {
  eventSlug: string;
  sessionId: number;
  quantity: number;
  guestName: string;
  email: string;
  phone: string;
  data?: Record<string, unknown>;
  promotionCode?: string;
}

export interface EventRegistrationResult {
  id: number;
  eventSlug: string;
  eventTitle: string;
  status: string;
  registeredAt: string;
  totalAmount: number;
  currency: string;
  paymentRequired: boolean;
}
