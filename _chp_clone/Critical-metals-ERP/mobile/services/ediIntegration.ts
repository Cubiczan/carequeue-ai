/**
 * EDI (Electronic Data Interchange) Service
 * 
 * Handles EDI transactions with suppliers
 * - EDI 850: Purchase Orders
 * - EDI 856: Advance Ship Notice
 * - EDI 810: Invoices
 * - EDI 997: Functional Acknowledgment
 */

import { offlineSync } from './offlineSync';

interface EDIDocument {
  documentId: string;
  type: '850' | '856' | '810' | '997';
  direction: 'outbound' | 'inbound';
  tradingPartner: string;
  status: 'pending' | 'sent' | 'received' | 'acknowledged' | 'error';
  createdAt: Date;
  processedAt?: Date;
  data: any;
  error?: string;
}

interface PurchaseOrder850 {
  poNumber: string;
  orderDate: Date;
  supplier: string;
  items: Array<{
    lineNumber: number;
    itemCode: string;
    description: string;
    quantity: number;
    unitPrice: number;
    uom: string;
  }>;
  totalAmount: number;
  shipToAddress: string;
  requestedDeliveryDate: Date;
}

interface AdvanceShipNotice856 {
  asnNumber: string;
  shipmentDate: Date;
  poNumber: string;
  supplier: string;
  carrier: string;
  trackingNumber: string;
  items: Array<{
    itemCode: string;
    quantityShipped: number;
    lotNumbers: string[];
  }>;
  packagingCode: string;
}

interface Invoice810 {
  invoiceNumber: string;
  invoiceDate: Date;
  poNumber: string;
  supplier: string;
  items: Array<{
    itemCode: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  totalAmount: number;
  paymentTerms: string;
  dueDate: Date;
}

class EDIService {
  private ediStandards = {
    '850': 'Purchase Order',
    '856': 'Advance Ship Notice',
    '810': 'Invoice',
    '997': 'Functional Acknowledgment',
  };

  /**
   * Create and send EDI 850 Purchase Order
   */
  async createPurchaseOrder(po: PurchaseOrder850): Promise<EDIDocument> {
    const document: EDIDocument = {
      documentId: `EDI850-${Date.now()}`,
      type: '850',
      direction: 'outbound',
      tradingPartner: po.supplier,
      status: 'pending',
      createdAt: new Date(),
      data: po,
    };

    // Queue for sending
    await offlineSync.queueAction({
      type: 'create',
      endpoint: '/api/edi/850',
      data: document,
    });

    return document;
  }

  /**
   * Process inbound EDI 856 Advance Ship Notice
   */
  async processASN(asnData: AdvanceShipNotice856): Promise<void> {
    const document: EDIDocument = {
      documentId: `EDI856-${Date.now()}`,
      type: '856',
      direction: 'inbound',
      tradingPartner: asnData.supplier,
      status: 'received',
      createdAt: new Date(),
      data: asnData,
    };

    // Create receiving document in ERPNext
    await offlineSync.queueAction({
      type: 'create',
      endpoint: '/api/edi/856/process',
      data: document,
    });

    // Auto-create purchase receipt
    await offlineSync.queueAction({
      type: 'create',
      endpoint: '/api/inventory/purchase-receipt',
      data: {
        supplier: asnData.supplier,
        poNumber: asnData.poNumber,
        trackingNumber: asnData.trackingNumber,
        items: asnData.items.map(item => ({
          item_code: item.itemCode,
          qty: item.quantityShipped,
          batch_no: item.lotNumbers[0],
        })),
      },
    });
  }

  /**
   * Process inbound EDI 810 Invoice
   */
  async processInvoice(invoiceData: Invoice810): Promise<void> {
    const document: EDIDocument = {
      documentId: `EDI810-${Date.now()}`,
      type: '810',
      direction: 'inbound',
      tradingPartner: invoiceData.supplier,
      status: 'received',
      createdAt: new Date(),
      data: invoiceData,
    };

    // Match with PO
    await offlineSync.queueAction({
      type: 'create',
      endpoint: '/api/edi/810/match',
      data: {
        invoice: document,
        poNumber: invoiceData.poNumber,
      },
    });

    // Create bill in ERPNext
    await offlineSync.queueAction({
      type: 'create',
      endpoint: '/api/edi/810/process',
      data: document,
    });
  }

  /**
   * Send EDI 997 Functional Acknowledgment
   */
  async sendAcknowledgment(
    originalDocumentId: string,
    accepted: boolean,
    errors?: string[]
  ): Promise<void> {
    const ack997: EDIDocument = {
      documentId: `EDI997-${Date.now()}`,
      type: '997',
      direction: 'outbound',
      tradingPartner: originalDocumentId,
      status: 'pending',
      createdAt: new Date(),
      data: {
        originalDocumentId,
        accepted,
        errors,
        acknowledgmentDate: new Date(),
      },
    };

    await offlineSync.queueAction({
      type: 'create',
      endpoint: '/api/edi/997',
      data: ack997,
    });
  }

  /**
   * Get EDI documents by type
   */
  async getDocuments(type?: string, status?: string): Promise<EDIDocument[]> {
    try {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (status) params.append('status', status);

      const response = await fetch(`/api/edi/documents?${params}`);
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to get EDI documents:', error);
      return [];
    }
  }

  /**
   * Get EDI transaction history with trading partner
   */
  async getTradingPartnerHistory(partnerId: string, months: number = 3): Promise<EDIDocument[]> {
    try {
      const response = await fetch(
        `/api/edi/partners/${partnerId}/history?months=${months}`
      );
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to get trading partner history:', error);
      return [];
    }
  }

  /**
   * Get EDI compliance metrics
   */
  async getComplianceMetrics(): Promise<{
    totalDocuments: number;
    successRate: number;
    avgProcessingTime: number;
    errorRate: number;
    byType: Record<string, { sent: number; received: number; errors: number }>;
  }> {
    try {
      const response = await fetch('/api/edi/compliance');
      const data = await response.json();
      return data.data || {
        totalDocuments: 0,
        successRate: 0,
        avgProcessingTime: 0,
        errorRate: 0,
        byType: {},
      };
    } catch (error) {
      console.error('Failed to get EDI compliance metrics:', error);
      return {
        totalDocuments: 0,
        successRate: 0,
        avgProcessingTime: 0,
        errorRate: 0,
        byType: {},
      };
    }
  }

  /**
   * Map EDI data to internal format
   */
  mapToInternal(ediData: any, type: string): any {
    switch (type) {
      case '850':
        return {
          poNumber: ediData.BEG02,
          orderDate: ediData.BEG03,
          supplier: ediData.N1_NA,
          items: ediData.PO1?.map((item: any) => ({
            itemCode: item.PO102,
            quantity: item.PO101,
            unitPrice: item.PO104,
          })),
        };
      case '856':
        return {
          asnNumber: ediData.BSN02,
          shipmentDate: ediData.BSN03,
          poNumber: ediData.HL_PR,
          trackingNumber: ediData.TD1?.TD101,
        };
      case '810':
        return {
          invoiceNumber: ediData.BIG02,
          invoiceDate: ediData.BIG03,
          totalAmount: ediData.TDS01,
        };
      default:
        return ediData;
    }
  }

  /**
   * Convert internal data to EDI X12 format
   */
  convertToX12(internalData: any, type: string): string {
    // Simplified X12 format generation
    const segments = [];
    
    // ISA - Interchange Control Header
    segments.push(`ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *${this.formatDate(new Date())}*${this.formatTime(new Date())}*U*00401*000000001*0*T*>~`);
    
    // GS - Functional Group Header
    segments.push(`GS*${type}*SENDER*RECEIVER*${this.formatDate(new Date())}*${this.formatTime(new Date())}*1*X*004010~`);
    
    // Transaction set specific segments
    if (type === '850') {
      segments.push(`ST*850*0001~`);
      segments.push(`BEG*00*SA*${internalData.poNumber}*${this.formatDate(internalData.orderDate)}~`);
      
      internalData.items?.forEach((item: any, index: number) => {
        segments.push(`PO1*${index + 1}*${item.quantity}*EA*${item.unitPrice}**${item.itemCode}~`);
      });
      
      segments.push(`SE*${segments.length + 2}*0001~`);
    }
    
    // GE - Functional Group Trailer
    segments.push(`GE*1*1~`);
    
    // IEA - Interchange Control Trailer
    segments.push(`IEA*1*000000001~`);
    
    return segments.join('\n');
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(2, 10).replace(/-/g, '');
  }

  private formatTime(date: Date): string {
    return date.toTimeString().slice(0, 8).replace(/:/g, '');
  }
}

// Export singleton instance
export const ediIntegration = new EDIService();
export default ediIntegration;
