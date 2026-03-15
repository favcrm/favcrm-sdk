export interface RegistrationSubmission {
  name: string;
  lastName?: string;
  phone: string;
  email?: string;
  birthMonthAndDay?: string; // "MMDD"
  gender?: 'M' | 'F' | 'O';
  agreeToReceivePromotion: boolean;
  agreeToPrivacyPolicy: boolean;
  membershipTier?: number;
  source?: string;
  utmData?: Record<string, string>;
}

export interface RegistrationResult {
  id: number;
  uuid: string;
  code: string;
  name: string;
  email?: string;
  phone: string;
  membershipTier: { id: number; name: string };
  token: string;
}
