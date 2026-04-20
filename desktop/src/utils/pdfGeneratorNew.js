/**
 * NEW PDF Generator - Fresh Implementation
 * Thermal Receipt Format: 80mm width
 * Created: December 2025
 */

import { jsPDF } from 'jspdf';

/**
 * Generate Delivery Challan PDF
 */
export const generateChallanPDF = (deliveryData, companyData) => {
  console.log('🆕 NEW PDF GENERATOR - Starting...');
  console.log('🆕 Company Data:', companyData);
  console.log('🆕 Delivery Data:', deliveryData);

  // Create PDF - 80mm width thermal receipt
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 297]
  });

  // CRITICAL: Set page to start rendering from absolute top
  pdf.setPage(1);
  
  const width = 80;
  const margin = 5;
  let y = 5; // Start from very top - changed from 10 to 5

  // Helper: Center text
  const addCenteredText = (text, yPos, fontSize = 10, bold = false) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.text(text, width / 2, yPos, { align: 'center' });
  };

  // Helper: Left-right text
  const addLeftRightText = (left, right, yPos, fontSize = 8) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', 'normal');
    pdf.text(left, margin, yPos);
    pdf.text(right, width - margin, yPos, { align: 'right' });
  };

  // ================================
  // 1. COMPANY HEADER
  // ================================
  console.log('🆕 Rendering company header at y=' + y);
  console.log('🆕 Company data:', companyData);
  
  // Add a visible background box for company header
  pdf.setFillColor(240, 240, 255); // Light blue background
  pdf.rect(0, 0, width, 35, 'F'); // Fill rectangle from top
  
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, width - margin, y);
  y += 4;

  // Company Name - LARGE AND BOLD
  pdf.setTextColor(0, 0, 139); // Dark blue text
  addCenteredText(companyData?.company_name || 'COMPANY NAME NOT SET', y, 13, true);
  y += 6;

  // Address
  pdf.setTextColor(0, 0, 0); // Black text
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  const address = companyData?.company_address || 'Address not available';
  const addressLines = pdf.splitTextToSize(address, width - 2 * margin);
  addressLines.forEach(line => {
    pdf.text(line, width / 2, y, { align: 'center' });
    y += 3.5;
  });

  // Phone & Email
  if (companyData?.company_phone) {
    addCenteredText(`📞 ${companyData.company_phone}`, y, 8);
    y += 4;
  }
  if (companyData?.company_email) {
    addCenteredText(`✉ ${companyData.company_email}`, y, 7);
    y += 4;
  }

  // Bottom border of header
  pdf.setLineWidth(0.8);
  pdf.line(margin, y, width - margin, y);
  y += 5;

  // Title
  addCenteredText('DELIVERY CHALLAN', y, 11, true);
  y += 5;

  pdf.line(margin, y, width - margin, y);
  y += 5;

  console.log('🆕 Company header complete, y=' + y);

  // ================================
  // 2. CHALLAN INFO
  // ================================
  pdf.setFontSize(8);
  addLeftRightText('Challan No:', deliveryData?.challan_number || 'N/A', y);
  y += 4;

  const date = deliveryData?.delivery_date ? new Date(deliveryData.delivery_date).toLocaleDateString() : 'N/A';
  addLeftRightText('Date:', date, y);
  y += 4;

  if (deliveryData?.warehouse_name) {
    addLeftRightText('Warehouse:', deliveryData.warehouse_name, y);
    y += 4;
  }

  y += 3;
  pdf.setLineWidth(0.2);
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, y, width - margin, y);
  y += 4;

  // ================================
  // 3. CUSTOMER DETAILS
  // ================================
  pdf.setFont('helvetica', 'bold');
  pdf.text('CUSTOMER DETAILS:', margin, y);
  y += 4;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);

  if (deliveryData?.shop_name) {
    pdf.text(`Shop: ${deliveryData.shop_name}`, margin, y);
    y += 3.5;
  }

  if (deliveryData?.shop_address) {
    const shopAddr = pdf.splitTextToSize(`Address: ${deliveryData.shop_address}`, width - 2 * margin);
    shopAddr.forEach(line => {
      pdf.text(line, margin, y);
      y += 3.5;
    });
  }

  if (deliveryData?.shop_contact) {
    pdf.text(`Contact: ${deliveryData.shop_contact}`, margin, y);
    y += 3.5;
  }

  if (deliveryData?.route_name) {
    const routeLines = pdf.splitTextToSize(`Route: ${deliveryData.route_name}`, width - 2 * margin);
    routeLines.forEach(line => {
      pdf.text(line, margin, y);
      y += 3.5;
    });
  }

  y += 3;
  pdf.line(margin, y, width - margin, y);
  y += 4;

  // ================================
  // 4. DRIVER & VEHICLE
  // ================================
  if (deliveryData?.driver_name || deliveryData?.vehicle_number) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('DELIVERY INFO:', margin, y);
    y += 4;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);

    if (deliveryData?.driver_name) {
      pdf.text(`Driver: ${deliveryData.driver_name}`, margin, y);
      y += 3.5;
    }

    if (deliveryData?.driver_phone) {
      pdf.text(`Phone: ${deliveryData.driver_phone}`, margin, y);
      y += 3.5;
    }

    if (deliveryData?.vehicle_number) {
      pdf.text(`Vehicle: ${deliveryData.vehicle_number} (${deliveryData.vehicle_type || 'N/A'})`, margin, y);
      y += 3.5;
    }

    y += 3;
    pdf.line(margin, y, width - margin, y);
    y += 4;
  }

  // ================================
  // 5. ITEMS
  // ================================
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('ITEMS:', margin, y);
  y += 5;

  const items = deliveryData?.items || [];
  console.log('🆕 Rendering', items.length, 'items');

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);

  items.forEach((item, index) => {
    // Item name
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${index + 1}. ${item.product_name || 'Product'}`, margin, y);
    y += 3.5;

    pdf.setFont('helvetica', 'normal');

    // Code
    if (item.product_code) {
      pdf.text(`   Code: ${item.product_code}`, margin, y);
      y += 3;
    }

    // Quantity x Price = Total
    const qty = parseFloat(item.quantity_delivered || item.quantity_ordered || 0);
    const price = parseFloat(item.unit_price || 0);
    const total = parseFloat(item.total_price || 0);

    pdf.text(`   ${qty} pcs x Rs.${price.toFixed(2)} = Rs.${total.toFixed(2)}`, margin, y);
    y += 4;
  });

  y += 3;
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, width - margin, y);
  y += 4;

  // ================================
  // 6. FINANCIAL SUMMARY
  // ================================
  pdf.setFontSize(8);

  // Subtotal
  if (deliveryData?.subtotal) {
    addLeftRightText('Subtotal:', `Rs. ${parseFloat(deliveryData.subtotal).toFixed(2)}`, y);
    y += 4;
  }

  // Discount
  if (deliveryData?.discount_amount && parseFloat(deliveryData.discount_amount) > 0) {
    const discPct = parseFloat(deliveryData.discount_percentage || 0).toFixed(2);
    addLeftRightText(`Discount (${discPct}%):`, `- Rs. ${parseFloat(deliveryData.discount_amount).toFixed(2)}`, y);
    y += 4;
  }

  // Tax
  if (deliveryData?.tax_amount && parseFloat(deliveryData.tax_amount) > 0) {
    const taxPct = parseFloat(deliveryData.tax_percentage || 0).toFixed(2);
    addLeftRightText(`Tax (${taxPct}%):`, `Rs. ${parseFloat(deliveryData.tax_amount).toFixed(2)}`, y);
    y += 4;
  }

  // Shipping
  if (deliveryData?.shipping_charges && parseFloat(deliveryData.shipping_charges) > 0) {
    addLeftRightText('Shipping:', `Rs. ${parseFloat(deliveryData.shipping_charges).toFixed(2)}`, y);
    y += 4;
  }

  // Other charges
  if (deliveryData?.other_charges && parseFloat(deliveryData.other_charges) > 0) {
    addLeftRightText('Other Charges:', `Rs. ${parseFloat(deliveryData.other_charges).toFixed(2)}`, y);
    y += 4;
  }

  // Round off
  if (deliveryData?.round_off && parseFloat(deliveryData.round_off) !== 0) {
    addLeftRightText('Round Off:', `Rs. ${parseFloat(deliveryData.round_off).toFixed(2)}`, y);
    y += 4;
  }

  // Grand Total
  pdf.setLineWidth(0.3);
  pdf.setDrawColor(0, 0, 0);
  pdf.line(margin, y, width - margin, y);
  y += 4;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  addLeftRightText('GRAND TOTAL:', `Rs. ${parseFloat(deliveryData.grand_total || 0).toFixed(2)}`, y, 10);
  y += 5;

  pdf.line(margin, y, width - margin, y);
  y += 5;

  // ================================
  // 7. SIGNATURES
  // ================================
  pdf.setFontSize(8);
  addCenteredText('SIGNATURES', y, 8, true);
  y += 5;

  // Signature boxes
  const sigWidth = (width - 3 * margin) / 2;

  // Prepared By
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('Prepared By:', margin, y);
  pdf.line(margin, y + 10, margin + sigWidth, y + 10);
  pdf.text('(Warehouse Staff)', margin, y + 13);

  // Dispatched By
  pdf.text('Dispatched By:', margin + sigWidth + margin, y);
  pdf.line(margin + sigWidth + margin, y + 10, width - margin, y + 10);
  pdf.text('(Manager)', margin + sigWidth + margin, y + 13);

  y += 18;

  // Received By
  pdf.text('Received By:', margin, y);
  pdf.line(margin, y + 10, margin + sigWidth, y + 10);
  pdf.text('(Driver)', margin, y + 13);

  // Customer
  pdf.text('Customer/Shop Owner:', margin + sigWidth + margin, y);
  pdf.line(margin + sigWidth + margin, y + 10, width - margin, y + 10);
  pdf.text('(Signature & Stamp)', margin + sigWidth + margin, y + 13);

  y += 18;

  // ================================
  // 8. FOOTER
  // ================================
  addCenteredText('Thank you for your business!', y, 6);
  y += 4;

  const timestamp = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  addCenteredText(`Generated: ${timestamp}`, y, 5);
  y += 5;

  // Set final page height
  pdf.internal.pageSize.setHeight(y + 5);

  console.log('🆕 PDF generation complete! Final height:', y);

  return pdf;
};

/**
 * Print PDF
 */
export const printChallan = (deliveryData, companyData) => {
  const pdf = generateChallanPDF(deliveryData, companyData);
  pdf.autoPrint();
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => {
      setTimeout(() => win.scrollTo(0, 0), 100);
    };
  }
};

/**
 * Download PDF
 */
export const downloadChallan = (deliveryData, companyData) => {
  const pdf = generateChallanPDF(deliveryData, companyData);
  const filename = `Challan_${deliveryData.challan_number || 'DRAFT'}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
};
