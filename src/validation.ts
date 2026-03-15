import type { RegistrationSubmission } from './types/member.js';
import type { EventRegistrationSubmission } from './types/event.js';

export interface ValidationError {
  field: string;
  code: 'REQUIRED' | 'INVALID_FORMAT';
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HK_PHONE_RE = /^(?:\+?852[-\s]?)?[2-9]\d{3}[-\s]?\d{4}$/;
const BIRTH_MMDD_RE = /^\d{4}$/;

export function validateEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function validatePhone(phone: string): boolean {
  return HK_PHONE_RE.test(phone.trim());
}

export function validateRequired(
  fields: Record<string, unknown>,
  required: string[],
): string | null {
  for (const key of required) {
    const value = fields[key];
    if (value == null || (typeof value === 'string' && value.trim() === '')) {
      return key;
    }
  }
  return null;
}

export function validateRegistrationForm(
  data: Partial<RegistrationSubmission>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.name?.trim()) {
    errors.push({ field: 'name', code: 'REQUIRED', message: 'Name is required' });
  }

  if (!data.phone?.trim()) {
    errors.push({ field: 'phone', code: 'REQUIRED', message: 'Phone is required' });
  } else if (!validatePhone(data.phone)) {
    errors.push({ field: 'phone', code: 'INVALID_FORMAT', message: 'Invalid phone number format' });
  }

  if (data.email != null && data.email.trim() !== '' && !validateEmail(data.email)) {
    errors.push({ field: 'email', code: 'INVALID_FORMAT', message: 'Invalid email format' });
  }

  if (data.birthMonthAndDay != null && !BIRTH_MMDD_RE.test(data.birthMonthAndDay)) {
    errors.push({ field: 'birthMonthAndDay', code: 'INVALID_FORMAT', message: 'Must be MMDD format' });
  }

  return errors;
}

export function validateEventRegistrationForm(
  data: Partial<EventRegistrationSubmission>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.eventSlug?.trim()) {
    errors.push({ field: 'eventSlug', code: 'REQUIRED', message: 'Event slug is required' });
  }

  if (data.sessionId == null) {
    errors.push({ field: 'sessionId', code: 'REQUIRED', message: 'Session is required' });
  }

  if (data.quantity == null || data.quantity < 1) {
    errors.push({ field: 'quantity', code: 'REQUIRED', message: 'Quantity must be at least 1' });
  }

  if (!data.guestName?.trim()) {
    errors.push({ field: 'guestName', code: 'REQUIRED', message: 'Guest name is required' });
  }

  if (!data.email?.trim()) {
    errors.push({ field: 'email', code: 'REQUIRED', message: 'Email is required' });
  } else if (!validateEmail(data.email)) {
    errors.push({ field: 'email', code: 'INVALID_FORMAT', message: 'Invalid email format' });
  }

  if (!data.phone?.trim()) {
    errors.push({ field: 'phone', code: 'REQUIRED', message: 'Phone is required' });
  } else if (!validatePhone(data.phone)) {
    errors.push({ field: 'phone', code: 'INVALID_FORMAT', message: 'Invalid phone number format' });
  }

  return errors;
}
