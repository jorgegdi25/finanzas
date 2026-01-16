import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CommercialDocument } from './types/document';

const COLORS = {
    primary: '#3ED6D8',
    primaryDark: '#0B0E14',
    accent: '#F2A08F',
    black: '#1A1A2E',
    white: '#FFFFFF',
    gray: '#64748B',
    lightGray: '#F8FAFC',
    border: '#E2E8F0'
};

function hexToRGB(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
        : [0, 0, 0];
}

export function generateDocumentPDF(doc: CommercialDocument) {
    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 15;
    let currentY = 0;

    // === HEADER BAND (Barra superior con color primario) ===
    pdf.setFillColor(...hexToRGB(COLORS.primaryDark));
    pdf.rect(0, 0, pageWidth, 35, 'F');

    // Título del documento
    pdf.setTextColor(...hexToRGB(COLORS.white));
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    const title = doc.type === 'quote' ? 'COTIZACIÓN' : 'CUENTA DE COBRO';
    pdf.text(title, margin, 22);

    // Número de documento (con estilo badge)
    pdf.setFillColor(...hexToRGB(COLORS.primary));
    const numberText = `No. ${doc.number}`;
    const numberWidth = pdf.getTextWidth(numberText) + 10;
    pdf.roundedRect(pageWidth - margin - numberWidth, 12, numberWidth, 10, 2, 2, 'F');
    pdf.setFontSize(10);
    pdf.setTextColor(...hexToRGB(COLORS.primaryDark));
    pdf.text(numberText, pageWidth - margin - numberWidth / 2, 19, { align: 'center' });

    currentY = 45;

    // === INFORMACIÓN DEL DOCUMENTO ===
    pdf.setTextColor(...hexToRGB(COLORS.gray));
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Fecha de emisión: ${doc.date}`, margin, currentY);

    currentY += 12;

    // === BLOQUES DE INFORMACIÓN (Emisor y Cliente) ===
    const blockWidth = (pageWidth - margin * 3) / 2;

    // Bloque Emisor
    pdf.setFillColor(...hexToRGB(COLORS.lightGray));
    pdf.roundedRect(margin, currentY, blockWidth, 35, 3, 3, 'F');

    pdf.setTextColor(...hexToRGB(COLORS.primary));
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DE:', margin + 5, currentY + 8);

    pdf.setTextColor(...hexToRGB(COLORS.black));
    pdf.setFontSize(11);
    pdf.text(doc.issuer.name, margin + 5, currentY + 15);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...hexToRGB(COLORS.gray));
    pdf.text(`NIT/CC: ${doc.issuer.id}`, margin + 5, currentY + 21);
    if (doc.issuer.email) pdf.text(doc.issuer.email, margin + 5, currentY + 26);
    if (doc.issuer.phone) pdf.text(doc.issuer.phone, margin + 5, currentY + 31);

    // Bloque Cliente
    const clientX = margin * 2 + blockWidth;
    pdf.setFillColor(...hexToRGB(COLORS.lightGray));
    pdf.roundedRect(clientX, currentY, blockWidth, 35, 3, 3, 'F');

    pdf.setTextColor(...hexToRGB(COLORS.accent));
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PARA:', clientX + 5, currentY + 8);

    pdf.setTextColor(...hexToRGB(COLORS.black));
    pdf.setFontSize(11);
    pdf.text(doc.client.name, clientX + 5, currentY + 15);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...hexToRGB(COLORS.gray));
    pdf.text(`NIT/CC: ${doc.client.id}`, clientX + 5, currentY + 21);
    if (doc.client.address) pdf.text(doc.client.address, clientX + 5, currentY + 26);

    currentY += 45;

    // === CONCEPTO ===
    pdf.setFillColor(...hexToRGB(COLORS.primaryDark));
    pdf.roundedRect(margin, currentY, pageWidth - margin * 2, 18, 3, 3, 'F');

    pdf.setTextColor(...hexToRGB(COLORS.primary));
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CONCEPTO', margin + 5, currentY + 6);

    pdf.setTextColor(...hexToRGB(COLORS.white));
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(doc.concept, margin + 5, currentY + 13);

    currentY += 25;

    // === TABLA DE ÍTEMS ===
    autoTable(pdf, {
        startY: currentY,
        head: [['#', 'Descripción', 'Cant.', 'Precio Unit.', 'Total']],
        body: doc.items.map((item, index) => [
            (index + 1).toString(),
            item.description,
            item.quantity.toString(),
            `$${item.unitPrice.toLocaleString('es-CO')}`,
            `$${item.total.toLocaleString('es-CO')}`
        ]),
        headStyles: {
            fillColor: hexToRGB(COLORS.primary),
            textColor: hexToRGB(COLORS.primaryDark),
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: 4
        },
        bodyStyles: {
            fontSize: 9,
            cellPadding: 4
        },
        alternateRowStyles: {
            fillColor: hexToRGB(COLORS.lightGray)
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 'auto' },
            2: { halign: 'center', cellWidth: 18 },
            3: { halign: 'right', cellWidth: 30 },
            4: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
        },
        margin: { left: margin, right: margin },
        theme: 'plain',
        styles: {
            lineColor: hexToRGB(COLORS.border),
            lineWidth: 0.1
        }
    });

    currentY = (pdf as any).lastAutoTable.finalY + 10;

    // === TOTALES ===
    const totalsWidth = 80;
    const totalsX = pageWidth - margin - totalsWidth;

    // Subtotal
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...hexToRGB(COLORS.gray));
    pdf.text('Subtotal:', totalsX, currentY);
    pdf.setTextColor(...hexToRGB(COLORS.black));
    pdf.text(`$${doc.totals.subtotal.toLocaleString('es-CO')}`, pageWidth - margin, currentY, { align: 'right' });

    if (doc.totals.tax) {
        currentY += 6;
        pdf.setTextColor(...hexToRGB(COLORS.gray));
        pdf.text('IVA:', totalsX, currentY);
        pdf.setTextColor(...hexToRGB(COLORS.black));
        pdf.text(`$${doc.totals.tax.toLocaleString('es-CO')}`, pageWidth - margin, currentY, { align: 'right' });
    }

    // Total con fondo destacado
    currentY += 10;
    pdf.setFillColor(...hexToRGB(COLORS.primary));
    pdf.roundedRect(totalsX - 5, currentY - 5, totalsWidth + 5, 12, 2, 2, 'F');
    pdf.setTextColor(...hexToRGB(COLORS.primaryDark));
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('TOTAL:', totalsX, currentY + 3);
    pdf.setFontSize(13);
    pdf.text(`$${doc.totals.total.toLocaleString('es-CO')}`, pageWidth - margin, currentY + 3, { align: 'right' });

    currentY += 20;

    // === NOTAS Y CONDICIONES ===
    if (doc.conditions && doc.conditions.length > 0) {
        pdf.setTextColor(...hexToRGB(COLORS.black));
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Notas y Condiciones:', margin, currentY);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(...hexToRGB(COLORS.gray));
        doc.conditions.forEach((cond, i) => {
            currentY += 5;
            pdf.text(`• ${cond}`, margin + 3, currentY);
        });
        currentY += 10;
    }

    // === INFORMACIÓN DE PAGO ===
    if (doc.issuer.bankInfo) {
        pdf.setFillColor(...hexToRGB(COLORS.lightGray));
        pdf.roundedRect(margin, currentY, (pageWidth - margin * 2) / 2 - 5, 20, 2, 2, 'F');

        pdf.setTextColor(...hexToRGB(COLORS.black));
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Información de Pago', margin + 5, currentY + 6);

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...hexToRGB(COLORS.gray));
        const lines = doc.issuer.bankInfo.split('\n');
        lines.forEach((line, i) => {
            pdf.text(line, margin + 5, currentY + 11 + (i * 4));
        });
    }

    // === FIRMA ===
    const signatureX = pageWidth - margin - 50;
    const signatureY = Math.max(currentY + 25, pageHeight - 40);

    pdf.setDrawColor(...hexToRGB(COLORS.gray));
    pdf.setLineWidth(0.3);
    pdf.line(signatureX, signatureY, signatureX + 50, signatureY);

    pdf.setTextColor(...hexToRGB(COLORS.black));
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(doc.issuer.signatureName || doc.issuer.name, signatureX + 25, signatureY + 5, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...hexToRGB(COLORS.gray));
    pdf.text('Firma Autorizada', signatureX + 25, signatureY + 9, { align: 'center' });

    // === FOOTER ===
    pdf.setFontSize(7);
    pdf.setTextColor(...hexToRGB(COLORS.gray));
    pdf.text(`Documento generado electrónicamente - ${new Date().toLocaleDateString('es-CO')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Descargar PDF
    pdf.save(`${doc.number}.pdf`);
}
