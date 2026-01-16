export type DocumentType = 'quote' | 'invoice';

export interface DocumentClient {
    name: string;
    id: string; // NIT o CC
    address?: string;
    phone?: string;
    email?: string;
    city?: string;
}

export interface DocumentItem {
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    total: number;
}

export interface DocumentTotals {
    subtotal: number;
    tax?: number;
    total: number;
}

export interface DocumentIssuer {
    name: string;
    id: string;
    phone?: string;
    email?: string;
    bankInfo?: string;
    signatureName?: string;
}

export interface CommercialDocument {
    type: DocumentType;
    number: string;
    date: string;
    expirationDate?: string;
    client: DocumentClient;
    concept: string;
    items: DocumentItem[];
    totals: DocumentTotals;
    conditions: string[];
    issuer: DocumentIssuer;
}
