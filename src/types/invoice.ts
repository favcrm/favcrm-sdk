export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'VOID' | 'CANCELLED';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: string;
  taxAmount: string;
  total: string;
  currency: string;
  status: InvoiceStatus;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

export interface InvoiceDetail extends Invoice {
  lineItems: InvoiceLineItem[];
}
