export interface DocumentSigningData {
  documentId: string;
  title: string;
  contentHtml: string;
  expiresAt: string;
  alreadySigned: boolean;
  recipientName: string | null;
}

export interface DocumentSignaturePayload {
  signature: {
    type: 'drawn' | 'typed';
    data: string;
  };
  agreedToTerms: boolean;
  customerName: string;
}

export interface DocumentSignatureResult {
  documentId: string;
  title: string;
  signedAt: string;
  signedPdfUrl: string | null;
}
