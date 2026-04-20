/**
 * PDF Generator Utility
 * Professional delivery challan PDF generation with signatures
 * Thermal Receipt Format: 80mm width (3.15 inches) x Dynamic height
 * Optimized for POS thermal printers and mobile-friendly viewing
 */

import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';

// Apply the autoTable plugin to jsPDF
applyPlugin(jsPDF);

/**
 * Generate professional delivery challan PDF in thermal receipt format
 * @param {Object} challanData - Complete challan data including items, charges, shop details
 * @param {Object} companyInfo - Company information for header
 * @returns {jsPDF} PDF document ready to save or print
 */
export const generateDeliveryChallanPDF = (challanData, companyInfo = {}) => {
  console.log('🎨 PDF GENERATOR - Starting generation...');
  console.log('🎨 PDF GENERATOR - Received companyInfo:', companyInfo);
  console.log('🎨 PDF GENERATOR - Received challanData:', challanData);
  
  // Thermal receipt size: 80mm width (226 pixels at 72 DPI)
  // Height is dynamic based on content
  const pageWidthMM = 80;
  const pageHeightMM = 297; // Start with A4 height, will expand as needed
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageWidthMM, pageHeightMM]
  });
  
  // Set default text color to black
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  
  // Map company settings fields from backend (company_name, company_address, etc.) 
  // to PDF generator format (name, address, etc.)
  const company = {
    name: companyInfo.company_name || companyInfo.name || 'Distribution System',
    address: companyInfo.company_address || companyInfo.address || 'Company Address',
    phone: companyInfo.company_phone || companyInfo.phone || 'Phone',
    email: companyInfo.company_email || companyInfo.email || 'email@company.com'
  };
  
  console.log('🎨 PDF GENERATOR - Mapped company object:', company);

  const pageWidth = doc.internal.pageSize.getWidth();
  let pageHeight = doc.internal.pageSize.getHeight();
  const margin = 5; // Margins
  let yPos = 8; // Start at top of page
  
  // Track content height for dynamic page sizing
  let maxContentHeight = 0;

  // Helper function to check if we need more space
  const ensureSpace = (requiredSpace) => {
    if (yPos + requiredSpace > pageHeight - 5) {
      // Extend page height instead of adding new page
      pageHeight += 50;
      doc.internal.pageSize.setHeight(pageHeight);
    }
    maxContentHeight = Math.max(maxContentHeight, yPos);
  };

  // Helper function for centered text
  const centerText = (text, y, fontSize = 10) => {
    doc.setFontSize(fontSize);
    doc.text(String(text || ''), pageWidth / 2, y, { align: 'center' });
  };

  // Helper function for left-right text
  const leftRightText = (left, right, y, fontSize = 8) => {
    doc.setFontSize(fontSize);
    doc.text(String(left || ''), margin, y);
    doc.text(String(right || ''), pageWidth - margin, y, { align: 'right' });
  };

  // ====================
  // HEADER SECTION - COMPANY INFORMATION
  // ====================
  
  console.log('🎨 PDF GENERATOR - Rendering company header...');
  console.log('🎨 PDF GENERATOR - Company name:', company.name);
  console.log('🎨 PDF GENERATOR - Company address:', company.address);
  console.log('🎨 PDF GENERATOR - Company phone:', company.phone);
  console.log('🎨 PDF GENERATOR - Company email:', company.email);
  console.log('🎨 PDF GENERATOR - Starting yPos:', yPos);
  
  // Ensure we start with proper spacing
  ensureSpace(50);
  
  console.log('🎨 PDF GENERATOR - After ensureSpace, yPos:', yPos);
  
  // Top border line
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;
  
  console.log('🎨 PDF GENERATOR - After top border, yPos:', yPos);
  
  // Company Name - BOLD AND LARGE
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  const companyNameText = company.name || 'Distribution System';
  console.log('🎨 PDF GENERATOR - Adding company name at yPos:', yPos, 'text:', companyNameText);
  doc.text(companyNameText, pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  
  // Company Address
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  const addressText = company.address || 'Company Address';
  const addressLines = doc.splitTextToSize(addressText, pageWidth - 2 * margin);
  addressLines.forEach(line => {
    doc.text(line, pageWidth / 2, yPos, { align: 'center' });
    yPos += 3;
  });
  
  // Phone
  if (company.phone && company.phone !== 'Phone') {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.text(`Tel: ${company.phone}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 3;
  }
  
  // Email
  if (company.email && company.email !== 'email@company.com') {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7);
    doc.text(`Email: ${company.email}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 3;
  }
  
  yPos += 2;
  
  // Separator line
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text('DELIVERY CHALLAN', pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // ====================
  // CHALLAN INFO
  // ====================
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  
  leftRightText('Challan No:', challanData.challan_number || 'N/A', yPos, 8);
  yPos += 4;
  
  const deliveryDate = challanData.delivery_date 
    ? new Date(challanData.delivery_date).toLocaleDateString('en-GB')
    : 'N/A';
  leftRightText('Date:', deliveryDate, yPos, 8);
  yPos += 4;
  
  if (challanData.invoice_number) {
    leftRightText('Invoice No:', challanData.invoice_number, yPos, 8);
    yPos += 4;
  }
  
  leftRightText('Status:', (challanData.status || 'pending').toUpperCase(), yPos, 8);
  yPos += 4;
  
  leftRightText('Warehouse:', challanData.warehouse_name || 'N/A', yPos, 8);
  yPos += 5;

  // ====================
  // CUSTOMER INFO
  // ====================
  
  ensureSpace(20);
  
  doc.setLineWidth(0.2);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 3;
  
  doc.setFont(undefined, 'bold');
  doc.setFontSize(8);
  doc.text('CUSTOMER DETAILS:', margin, yPos);
  yPos += 4;
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(7);
  doc.text(`Name: ${challanData.shop_name || 'N/A'}`, margin, yPos);
  yPos += 3.5;
  
  if (challanData.shop_address) {
    const shopAddressLines = doc.splitTextToSize(`Address: ${challanData.shop_address}`, pageWidth - 2 * margin);
    shopAddressLines.forEach(line => {
      doc.text(line, margin, yPos);
      yPos += 3.5;
    });
  }
  
  if (challanData.shop_contact) {
    doc.text(`Contact: ${challanData.shop_contact}`, margin, yPos);
    yPos += 3.5;
  }
  
  if (challanData.route_name) {
    doc.text(`Route: ${challanData.route_name}`, margin, yPos);
    yPos += 3.5;
  }
  
  yPos += 2;

  // ====================
  // DELIVERY INFO
  // ====================
  
  ensureSpace(20);
  
  if (challanData.driver_name || challanData.vehicle_number) {
    doc.setLineWidth(0.2);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 3;
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.text('DELIVERY INFO:', margin, yPos);
    yPos += 4;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7);
    
    if (challanData.driver_name) {
      doc.text(`Driver: ${challanData.driver_name}`, margin, yPos);
      yPos += 3.5;
    }
    
    if (challanData.driver_phone) {
      doc.text(`Phone: ${challanData.driver_phone}`, margin, yPos);
      yPos += 3.5;
    }
    
    if (challanData.vehicle_number) {
      doc.text(`Vehicle: ${challanData.vehicle_number}`, margin, yPos);
      yPos += 3.5;
      
      if (challanData.vehicle_type) {
        doc.text(`Type: ${challanData.vehicle_type}`, margin, yPos);
        yPos += 3.5;
      }
    }
    
    yPos += 2;
  }

  // ====================
  // ITEMS TABLE
  // ====================
  
  ensureSpace(30);
  
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;
  
  doc.setFont(undefined, 'bold');
  doc.setFontSize(8);
  doc.text('ITEMS:', margin, yPos);
  yPos += 5;
  
  // Items table with compact format for thermal receipt
  const items = challanData.items || [];
  
  console.log('🎨 PDF GENERATOR - Items array:', items);
  console.log('🎨 PDF GENERATOR - Items count:', items.length);
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(7);
  
  items.forEach((item, index) => {
    console.log(`🎨 PDF GENERATOR - Rendering item ${index + 1}:`, item);
    
    ensureSpace(15);
    
    // Item number and name
    doc.setFont(undefined, 'bold');
    doc.text(`${index + 1}. ${item.product_name || 'Unknown Product'}`, margin, yPos);
    yPos += 3.5;
    
    doc.setFont(undefined, 'normal');
    
    // Product code (if available)
    if (item.product_code) {
      doc.text(`   Code: ${item.product_code}`, margin, yPos);
      yPos += 3;
    }
    
    // Quantity, Unit Price, Total - on one line
    const qty = parseFloat(item.quantity_ordered || item.quantity || item.quantity_delivered || 0);
    const unit = item.unit || 'pcs';
    const price = parseFloat(item.unit_price || item.price || 0);
    const total = parseFloat(item.total_amount || item.total_price || 0);
    
    console.log(`🎨 PDF GENERATOR - Item ${index + 1} values: qty=${qty}, unit=${unit}, price=${price}, total=${total}`);
    
    doc.text(`   ${qty} ${unit} x Rs.${price.toFixed(2)} = Rs.${total.toFixed(2)}`, margin, yPos);
    yPos += 4;
  });
  
  yPos += 2;

  // ====================
  // FINANCIAL SUMMARY
  // ====================
  
  ensureSpace(40);
  
  doc.setLineWidth(0.2);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;
  
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  
  // Subtotal
  if (challanData.subtotal) {
    leftRightText('Subtotal:', `Rs. ${parseFloat(challanData.subtotal).toFixed(2)}`, yPos, 8);
    yPos += 4;
  }
  
  // Discount
  if (challanData.discount_amount && parseFloat(challanData.discount_amount) > 0) {
    const discPct = parseFloat(challanData.discount_percentage || 0).toFixed(2);
    leftRightText(`Discount (${discPct}%):`, `- Rs. ${parseFloat(challanData.discount_amount).toFixed(2)}`, yPos, 8);
    yPos += 4;
  }
  
  // Tax
  if (challanData.tax_amount && parseFloat(challanData.tax_amount) > 0) {
    const taxPct = parseFloat(challanData.tax_percentage || 0).toFixed(2);
    leftRightText(`Tax (${taxPct}%):`, `Rs. ${parseFloat(challanData.tax_amount).toFixed(2)}`, yPos, 8);
    yPos += 4;
  }
  
  // Shipping
  if (challanData.shipping_charges && parseFloat(challanData.shipping_charges) > 0) {
    leftRightText('Shipping:', `Rs. ${parseFloat(challanData.shipping_charges).toFixed(2)}`, yPos, 8);
    yPos += 4;
  }
  
  // Other Charges
  if (challanData.other_charges && parseFloat(challanData.other_charges) > 0) {
    leftRightText('Other Charges:', `Rs. ${parseFloat(challanData.other_charges).toFixed(2)}`, yPos, 8);
    yPos += 4;
  }
  
  // Round Off
  if (challanData.round_off && parseFloat(challanData.round_off) !== 0) {
    leftRightText('Round Off:', `Rs. ${parseFloat(challanData.round_off).toFixed(2)}`, yPos, 8);
    yPos += 4;
  }
  
  // Grand Total Line
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;
  
  // Grand Total - Bold
  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  const grandTotal = parseFloat(challanData.grand_total || 0).toFixed(2);
  leftRightText('GRAND TOTAL:', `Rs. ${grandTotal}`, yPos, 10);
  yPos += 5;
  
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // ====================
  // NOTES SECTION
  // ====================
  
  if (challanData.notes) {
    ensureSpace(15);
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(7);
    doc.text('NOTES:', margin, yPos);
    yPos += 3;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(6);
    const notesLines = doc.splitTextToSize(challanData.notes, pageWidth - 2 * margin);
    notesLines.forEach(line => {
      doc.text(line, margin, yPos);
      yPos += 3;
    });
    yPos += 3;
  }

  // ====================
  // SIGNATURE SECTION
  // ====================
  
  ensureSpace(55);
  
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;
  
  doc.setFont(undefined, 'bold');
  doc.setFontSize(8);
  centerText('SIGNATURES', yPos, 8);
  yPos += 5;
  
  // Prepared By
  doc.setFont(undefined, 'normal');
  doc.setFontSize(7);
  doc.text('Prepared By:', margin, yPos);
  yPos += 8;
  doc.setLineWidth(0.2);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  doc.setFontSize(6);
  doc.text('(Manager/Admin)', margin, yPos + 2.5);
  yPos += 7;
  
  // Dispatched By
  doc.setFontSize(7);
  doc.text('Dispatched By:', margin, yPos);
  yPos += 8;
  doc.setLineWidth(0.2);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  doc.setFontSize(6);
  doc.text('(Warehouse Supervisor)', margin, yPos + 2.5);
  yPos += 7;
  
  // Received By
  doc.setFontSize(7);
  doc.text('Received By:', margin, yPos);
  yPos += 8;
  doc.setLineWidth(0.2);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  doc.setFontSize(6);
  doc.text('(Customer/Shop Owner)', margin, yPos + 2.5);
  yPos += 7;
  
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // ====================
  // FOOTER
  // ====================
  
  ensureSpace(10);
  
  doc.setFont(undefined, 'italic');
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  
  const footerText = 'Thank you for your business!';
  centerText(footerText, yPos, 6);
  yPos += 3;
  
  const timestamp = new Date().toLocaleString('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  centerText(`Generated: ${timestamp}`, yPos, 5);
  yPos += 5;
  
  // Set final page height to actual content height
  doc.internal.pageSize.setHeight(yPos);

  console.log('🎨 PDF GENERATOR - ✅ PDF generation complete!');
  console.log('🎨 PDF GENERATOR - Final PDF height:', yPos, 'mm');
  console.log('🎨 PDF GENERATOR - Page dimensions:', doc.internal.pageSize.getWidth(), 'x', doc.internal.pageSize.getHeight(), 'mm');

  return doc;
};

/**
 * Download PDF to user's computer
 */
export const downloadChallanPDF = (challanData, companyInfo) => {
  const doc = generateDeliveryChallanPDF(challanData, companyInfo);
  const filename = `Challan_${challanData.challan_number || 'DRAFT'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

/**
 * Print PDF directly
 */
export const printChallanPDF = (challanData, companyInfo) => {
  console.log('📄 PRINT FUNCTION - Called with:', { challanData, companyInfo });
  
  const doc = generateDeliveryChallanPDF(challanData, companyInfo);
  
  console.log('📄 PRINT FUNCTION - PDF generated, doc object:', doc);
  console.log('📄 PRINT FUNCTION - PDF page count:', doc.internal.getNumberOfPages());
  console.log('📄 PRINT FUNCTION - PDF page size:', doc.internal.pageSize.getWidth(), 'x', doc.internal.pageSize.getHeight());
  
  // Set PDF to open at top of page
  doc.autoPrint();
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  
  console.log('📄 PRINT FUNCTION - Opening PDF blob URL:', url);
  
  // Open in new window with specific parameters to ensure it starts at top
  const printWindow = window.open(url, '_blank', 'toolbar=no,scrollbars=yes,resizable=yes,top=0,left=0');
  if (printWindow) {
    printWindow.onload = function() {
      console.log('📄 PRINT FUNCTION - PDF window loaded, scrolling to top');
      // Scroll to top after PDF loads
      printWindow.scrollTo(0, 0);
      setTimeout(() => {
        printWindow.scrollTo(0, 0);
      }, 100);
    };
  }
};

const pdfGenerator = {
  generateDeliveryChallanPDF,
  downloadChallanPDF,
  printChallanPDF
};

export default pdfGenerator;
