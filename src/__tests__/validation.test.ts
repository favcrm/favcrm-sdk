import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePhone,
  validateOtp,
  validateRequired,
  validateRegistrationForm,
  validateEventRegistrationForm,
} from '../validation';

describe('validateEmail', () => {
  it.each([
    'alice@example.com',
    'bob+tag@test.co.uk',
    'user@sub.domain.com',
  ])('accepts valid email: %s', (email) => {
    expect(validateEmail(email)).toBe(true);
  });

  it.each([
    '',
    'notanemail',
    '@missing.com',
    'missing@',
    'spaces in@email.com',
    'missing@.com',
  ])('rejects invalid email: %s', (email) => {
    expect(validateEmail(email)).toBe(false);
  });

  it('trims whitespace', () => {
    expect(validateEmail('  alice@example.com  ')).toBe(true);
  });
});

describe('validatePhone', () => {
  it.each([
    '91234567',
    '21234567',
    '+85291234567',
    '+852 9123 4567',
    '852-9123-4567',
    '+14155552671',
    '0123 456 7890',
  ])('accepts valid phone: %s', (phone) => {
    expect(validatePhone(phone)).toBe(true);
  });

  it.each([
    '',
    '123',         // too short
    '123456',      // too short (< 7 digits)
    'abcdefgh',
    'not-a-phone',
  ])('rejects invalid phone: %s', (phone) => {
    expect(validatePhone(phone)).toBe(false);
  });
});

describe('validateOtp', () => {
  it.each([
    '123456',
    '000000',
    '999999',
  ])('accepts valid OTP: %s', (otp) => {
    expect(validateOtp(otp)).toBe(true);
  });

  it.each([
    '',
    '12345',       // 5 digits
    '1234567',     // 7 digits
    'abcdef',
    '12 34 56',
  ])('rejects invalid OTP: %s', (otp) => {
    expect(validateOtp(otp)).toBe(false);
  });
});

describe('validateRequired', () => {
  it('returns null when all required fields present', () => {
    expect(validateRequired({ name: 'Alice', phone: '91234567' }, ['name', 'phone'])).toBeNull();
  });

  it('returns first missing field', () => {
    expect(validateRequired({ name: '' }, ['name', 'phone'])).toBe('name');
  });

  it('returns field with null value', () => {
    expect(validateRequired({ name: 'Alice', phone: null }, ['name', 'phone'])).toBe('phone');
  });

  it('returns field with undefined value', () => {
    expect(validateRequired({}, ['name'])).toBe('name');
  });
});

describe('validateRegistrationForm', () => {
  const validData = {
    name: 'Alice',
    phone: '91234567',
    agreeToReceivePromotion: true,
    agreeToPrivacyPolicy: true,
  };

  it('returns empty array for valid data', () => {
    expect(validateRegistrationForm(validData)).toEqual([]);
  });

  it('returns error for missing name', () => {
    const errors = validateRegistrationForm({ ...validData, name: '' });
    expect(errors).toEqual([
      { field: 'name', code: 'REQUIRED', message: 'Name is required' },
    ]);
  });

  it('returns error for missing phone', () => {
    const errors = validateRegistrationForm({ ...validData, phone: undefined });
    expect(errors).toEqual([
      { field: 'phone', code: 'REQUIRED', message: 'Phone is required' },
    ]);
  });

  it('returns error for invalid phone format', () => {
    const errors = validateRegistrationForm({ ...validData, phone: '123' });
    expect(errors).toEqual([
      { field: 'phone', code: 'INVALID_FORMAT', message: 'Invalid phone number format' },
    ]);
  });

  it('returns error for invalid email when provided', () => {
    const errors = validateRegistrationForm({ ...validData, email: 'bademail' });
    expect(errors).toEqual([
      { field: 'email', code: 'INVALID_FORMAT', message: 'Invalid email format' },
    ]);
  });

  it('allows empty email (optional)', () => {
    const errors = validateRegistrationForm({ ...validData, email: '' });
    expect(errors).toEqual([]);
  });

  it('validates birthMonthAndDay format', () => {
    const errors = validateRegistrationForm({ ...validData, birthMonthAndDay: '12' });
    expect(errors).toEqual([
      { field: 'birthMonthAndDay', code: 'INVALID_FORMAT', message: 'Must be MMDD format' },
    ]);
  });

  it('accepts valid birthMonthAndDay', () => {
    const errors = validateRegistrationForm({ ...validData, birthMonthAndDay: '0315' });
    expect(errors).toEqual([]);
  });

  it('returns multiple errors', () => {
    const errors = validateRegistrationForm({});
    expect(errors.length).toBe(2); // name + phone
  });
});

describe('validateEventRegistrationForm', () => {
  const validData = {
    eventSlug: 'summer-fest',
    sessionId: 1,
    quantity: 2,
    guestName: 'Bob',
    email: 'bob@test.com',
    phone: '91234567',
  };

  it('returns empty array for valid data', () => {
    expect(validateEventRegistrationForm(validData)).toEqual([]);
  });

  it('returns error for missing eventSlug', () => {
    const errors = validateEventRegistrationForm({ ...validData, eventSlug: '' });
    expect(errors.some(e => e.field === 'eventSlug')).toBe(true);
  });

  it('returns error for missing sessionId', () => {
    const errors = validateEventRegistrationForm({ ...validData, sessionId: undefined });
    expect(errors.some(e => e.field === 'sessionId')).toBe(true);
  });

  it('returns error for quantity < 1', () => {
    const errors = validateEventRegistrationForm({ ...validData, quantity: 0 });
    expect(errors.some(e => e.field === 'quantity')).toBe(true);
  });

  it('returns error for missing guestName', () => {
    const errors = validateEventRegistrationForm({ ...validData, guestName: '' });
    expect(errors.some(e => e.field === 'guestName')).toBe(true);
  });

  it('returns error for invalid email', () => {
    const errors = validateEventRegistrationForm({ ...validData, email: 'notvalid' });
    expect(errors.some(e => e.field === 'email' && e.code === 'INVALID_FORMAT')).toBe(true);
  });

  it('returns error for invalid phone', () => {
    const errors = validateEventRegistrationForm({ ...validData, phone: '123' });
    expect(errors.some(e => e.field === 'phone' && e.code === 'INVALID_FORMAT')).toBe(true);
  });

  it('returns all errors for empty data', () => {
    const errors = validateEventRegistrationForm({});
    expect(errors.length).toBeGreaterThanOrEqual(5);
  });
});
