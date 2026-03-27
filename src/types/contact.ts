export interface ContactEnquirySubmission {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

export interface ContactEnquiryResult {
  conversationId: string;
  messageId: string;
}
