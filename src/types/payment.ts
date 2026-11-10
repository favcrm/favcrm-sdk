/** Provider-neutral result for a hosted, one-time payment redirect. */
export interface PaymentSessionResult {
  paymentUrl: string;
  sessionId: string;
  transactionId: string;
}
