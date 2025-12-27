// Programmatic PDF generation with jsPDF
// Clean typography, professional spacing, handles page breaks

import jsPDF from 'jspdf';
import { Invoice, MerchantConfig } from '@/types';

export async function generateInvoicePDF(invoice: Invoice, merchantConfig?: MerchantConfig): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  let yPosition = margin;

  // Helper: Add text with automatic wrapping
  const addText = (
    text: string,
    x: number,
    y: number,
    options?: {
      fontSize?: number;
      fontStyle?: 'normal' | 'bold';
      align?: 'left' | 'center' | 'right';
      maxWidth?: number;
    }
  ): number => {
    const fontSize = options?.fontSize || 10;
    const fontStyle = options?.fontStyle || 'normal';
    const align = options?.align || 'left';
    const maxWidth = options?.maxWidth || contentWidth;

    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', fontStyle);

    const lines = pdf.splitTextToSize(text, maxWidth);
    const lineHeight = fontSize * 0.35;

    lines.forEach((line: string, index: number) => {
      let xPos = x;
      if (align === 'center') {
        xPos = x + maxWidth / 2;
      } else if (align === 'right') {
        xPos = x + maxWidth;
      }
      
      pdf.text(line, xPos, y + (index * lineHeight), { align });
    });

    return y + (lines.length * lineHeight);
  };

  // Helper: Check if we need a new page
  const checkPageBreak = (requiredSpace: number): void => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }
  };

  // Header
  yPosition = addText('INVOICE', margin, yPosition, {
    fontSize: 24,
    fontStyle: 'bold',
  });
  
  // Merchant details in top right
  const rightColX = pageWidth - margin - 60;
  let merchantY = margin;
  
  merchantY = addText(merchantConfig?.businessName || 'Your Business', rightColX, merchantY, {
    fontSize: 10,
    fontStyle: 'bold',
    align: 'right',
    maxWidth: 60,
  });
  merchantY += 4;
  
  merchantY = addText(merchantConfig?.address1 || '', rightColX, merchantY, {
    fontSize: 9,
    align: 'right',
    maxWidth: 60,
  });
  merchantY += 3.5;
  
  merchantY = addText(merchantConfig?.address2 || '', rightColX, merchantY, {
    fontSize: 9,
    align: 'right',
    maxWidth: 60,
  });
  merchantY += 3.5;
  
  merchantY = addText(merchantConfig?.phone ? `Ph: ${merchantConfig.phone}` : '', rightColX, merchantY, {
    fontSize: 9,
    align: 'right',
    maxWidth: 60,
  });
  
  if (merchantConfig?.email) {
    merchantY += 3.5;
    merchantY = addText(merchantConfig.email, rightColX, merchantY, {
      fontSize: 9,
      align: 'right',
      maxWidth: 60,
    });
  }
  
  if (merchantConfig?.gstNumber) {
    merchantY += 3.5;
    merchantY = addText(`GST: ${merchantConfig.gstNumber}`, rightColX, merchantY, {
      fontSize: 9,
      align: 'right',
      maxWidth: 60,
    });
  }
  
  yPosition += 8;

  // Invoice details
  const invoiceDate = new Date(invoice.createdAt).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  yPosition = addText(`Invoice #${invoice.id.slice(0, 8).toUpperCase()}`, margin, yPosition, {
    fontSize: 10,
  });
  yPosition += 5;

  yPosition = addText(`Date: ${invoiceDate}`, margin, yPosition, {
    fontSize: 10,
  });
  yPosition += 10;

  // Customer details
  pdf.setDrawColor(230, 230, 230);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  yPosition = addText('Bill To:', margin, yPosition, {
    fontSize: 10,
    fontStyle: 'bold',
  });
  yPosition += 5;

  yPosition = addText(invoice.customerName, margin, yPosition, {
    fontSize: 11,
    fontStyle: 'bold',
  });
  yPosition += 4;

  if (invoice.customerPhone) {
    yPosition = addText(invoice.customerPhone, margin, yPosition, {
      fontSize: 10,
    });
    yPosition += 4;
  }

  if (invoice.customerAddress) {
    yPosition = addText(invoice.customerAddress, margin, yPosition, {
      fontSize: 10,
    });
    yPosition += 4;
  }

  yPosition += 6;

  // Line items table
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;

  // Table header
  const colWidths = {
    item: contentWidth * 0.45,
    qty: contentWidth * 0.15,
    price: contentWidth * 0.20,
    total: contentWidth * 0.20,
  };

  let xPos = margin;
  yPosition = addText('Item', xPos, yPosition, {
    fontSize: 10,
    fontStyle: 'bold',
  });

  xPos += colWidths.item;
  addText('Qty', xPos, yPosition, {
    fontSize: 10,
    fontStyle: 'bold',
    align: 'center',
    maxWidth: colWidths.qty,
  });

  xPos += colWidths.qty;
  addText('Price', xPos, yPosition, {
    fontSize: 10,
    fontStyle: 'bold',
    align: 'right',
    maxWidth: colWidths.price,
  });

  xPos += colWidths.price;
  addText('Amount', xPos, yPosition, {
    fontSize: 10,
    fontStyle: 'bold',
    align: 'right',
    maxWidth: colWidths.total,
  });

  yPosition += 5;
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;

  // Line items
  invoice.lineItems.forEach((item, index) => {
    checkPageBreak(15);

    xPos = margin;
    const itemY = addText(item.productName, xPos, yPosition, {
      fontSize: 10,
      maxWidth: colWidths.item,
    });

    xPos += colWidths.item;
    const qtyText = `${item.quantity} ${item.unit || 'piece'}`;
    addText(qtyText, xPos, yPosition, {
      fontSize: 10,
      align: 'center',
      maxWidth: colWidths.qty,
    });

    xPos += colWidths.qty;
    addText(`₹${item.unitPrice.toFixed(2)}`, xPos, yPosition, {
      fontSize: 10,
      align: 'right',
      maxWidth: colWidths.price,
    });

    xPos += colWidths.price;
    addText(`₹${(item.unitPrice * item.quantity).toFixed(2)}`, xPos, yPosition, {
      fontSize: 10,
      align: 'right',
      maxWidth: colWidths.total,
    });

    yPosition = itemY + 5;
  });

  yPosition += 4;
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Totals section
  checkPageBreak(30);

  const totalsX = pageWidth - margin - (contentWidth * 0.4);
  
  xPos = totalsX;
  yPosition = addText('Subtotal:', xPos, yPosition, {
    fontSize: 11,
    fontStyle: 'bold',
  });

  addText(`₹${invoice.subtotal.toFixed(2)}`, xPos + (contentWidth * 0.1), yPosition - 4, {
    fontSize: 11,
    align: 'right',
    maxWidth: contentWidth * 0.2,
  });

  yPosition += 8;

  // Total
  pdf.setFillColor(240, 240, 240);
  pdf.rect(totalsX - 5, yPosition - 6, contentWidth * 0.4 + 10, 12, 'F');

  yPosition = addText('TOTAL:', xPos, yPosition, {
    fontSize: 14,
    fontStyle: 'bold',
  });

  addText(`₹${invoice.total.toFixed(2)}`, xPos + (contentWidth * 0.1), yPosition - 5, {
    fontSize: 14,
    fontStyle: 'bold',
    align: 'right',
    maxWidth: contentWidth * 0.2,
  });

  yPosition += 15;

  // Footer
  checkPageBreak(20);
  yPosition = Math.max(yPosition, pageHeight - margin - 20);

  pdf.setDrawColor(230, 230, 230);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;

  addText('Thank you for your business!', margin, yPosition, {
    fontSize: 10,
    align: 'center',
    maxWidth: contentWidth,
  });

  // Return as blob
  return pdf.output('blob');
}
