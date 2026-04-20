// Delivery Challan Generation Page
// Purpose: Generate delivery challans from invoices or orders

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Truck, Package, Phone, FileText, 
  Printer, ArrowLeft, AlertCircle, CheckCircle,
  MapPin, Search, X, Download
} from 'lucide-react';
import deliveryService from '../../services/deliveryService';
import warehouseService from '../../services/warehouseService';
import invoiceService from '../../services/invoiceService';
import settingsService from '../../services/settingsService';
import { downloadChallanPDF, printChallanPDF } from '../../utils/pdfGenerator';

const DeliveryChallanPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get source data from navigation state (if coming from invoice/order page)
  const sourceData = location.state;
  
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [companySettings, setCompanySettings] = useState(null);
  
  // Invoice selection states
  const [availableInvoices, setAvailableInvoices] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [searchNumber, setSearchNumber] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    warehouse_id: '',
    source_type: sourceData?.type || 'invoice', // 'invoice' or 'order'
    source_id: sourceData?.id || '',
    delivery_date: new Date().toISOString().split('T')[0],
    driver_name: '',
    driver_phone: '',
    driver_cnic: '',
    vehicle_number: '',
    vehicle_type: 'truck',
    notes: '',
    status: 'pending'
  });
  
  // Items from invoice with selection for partial delivery
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set()); // Track selected item indices
  const [itemsWithChallan, setItemsWithChallan] = useState(new Set()); // Track items that already have challan (red ticks)
  const [showChallanInfoPopup, setShowChallanInfoPopup] = useState(false); // Show popup explaining red ticks
  const [shopDetails, setShopDetails] = useState(null);
  
  // Invoice-level charges (tax, shipping, other charges) - FROM INVOICE
  const [invoiceCharges, setInvoiceCharges] = useState({
    subtotal: 0,
    discount_percentage: 0,
    discount_amount: 0,
    tax_percentage: 0,
    tax_amount: 0,
    shipping_charges: 0,
    other_charges: 0,
    round_off: 0,
    grand_total: 0
  });

  // Manual charges override - ADMIN ENTERED
  const [manualCharges, setManualCharges] = useState({
    enabled: false, // Whether manual charges are enabled
    discount_amount: '',
    tax_amount: '',
    shipping_charges: '',
    other_charges: '',
    round_off: ''
  });

  useEffect(() => {
    fetchWarehouses();
    fetchAvailableInvoices();
    loadCompanySettings();
    
    // If coming from another page with source data
    if (sourceData && sourceData.type === 'invoice') {
      loadSourceData('invoice', sourceData.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch available invoices for dropdown
  const fetchAvailableInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const response = await invoiceService.getInvoicesAvailableForDelivery();
      setAvailableInvoices(response.data || []);
      console.log('📋 Available invoices loaded:', response.data?.length || 0);
    } catch (error) {
      console.error('Error fetching available invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await warehouseService.getAllWarehouses({ status: 'active' });
      setWarehouses(response.data || []);
      
      // Auto-select warehouse: priority order - default, first warehouse if only one exists
      const defaultWarehouse = response.data?.find(w => w.is_default);
      const firstWarehouse = response.data?.[0];
      
      if (!formData.warehouse_id) {
        if (defaultWarehouse) {
          console.log('✅ Auto-selecting default warehouse:', defaultWarehouse.name);
          setFormData(prev => ({ ...prev, warehouse_id: defaultWarehouse.id }));
        } else if (response.data?.length === 1) {
          console.log('✅ Auto-selecting only warehouse:', firstWarehouse.name);
          setFormData(prev => ({ ...prev, warehouse_id: firstWarehouse.id }));
        } else {
          console.log('⚠️ Multiple warehouses found, user must select');
        }
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const loadCompanySettings = async () => {
    try {
      console.log('🔄 Loading company settings...');
      const response = await settingsService.getCompanySettings();
      console.log('📦 Company settings API response:', response);
      if (response.success && response.data) {
        console.log('✅ Setting company data:', response.data);
        setCompanySettings(response.data);
      } else {
        console.warn('⚠️ No company data in response');
      }
    } catch (error) {
      console.error('❌ Error loading company settings:', error);
    }
  };

  const loadSourceData = async (type, id) => {
    console.log('\n' + '='.repeat(60));
    console.log('📦 STEP 2: LOADING SOURCE DATA');
    console.log('='.repeat(60));
    
    try {
      setIsSearching(true);
      
      if (type === 'invoice') {
        console.log('📝 Type:', type);
        console.log('📝 Invoice ID:', id);
        console.log('📤 Calling invoiceService.getInvoiceById()...');
        
        const response = await invoiceService.getInvoiceById(id);
        console.log('📥 Response Received:');
        console.log('   - Success:', response.success);
        console.log('   - Response Structure:', Object.keys(response));
        
        const invoice = response.data;
        
        // ⚠️ CRITICAL VALIDATION CHECK
        console.log('\n⚠️ VALIDATION CHECK:');
        console.log('   - Requested Invoice ID:', id);
        console.log('   - Received Invoice ID:', invoice.id);
        console.log('   - Invoice Number:', invoice.invoice_number);
        if (parseInt(id) !== parseInt(invoice.id)) {
          console.error('❌❌❌ MISMATCH! Requested ID ' + id + ' but got ID ' + invoice.id);
        } else {
          console.log('   ✅ IDs match - correct invoice loaded');
        }
        
        console.log('\n✅ INVOICE DATA LOADED:');
        console.log('   - ID:', invoice.id);
        console.log('   - Invoice Number:', invoice.invoice_number);
        console.log('   - Order ID:', invoice.order_id);
        console.log('   - Shop ID:', invoice.shop_id);
        console.log('   - Shop Name:', invoice.shop_name);
        console.log('   - Shop Address:', invoice.shop_address);
        console.log('   - Shop Phone:', invoice.shop_phone);
        console.log('   - Shop Contact:', invoice.shop_contact);
        console.log('   - Route ID:', invoice.route_id);
        console.log('   - Route Name:', invoice.route_name);
        console.log('   - Salesman ID:', invoice.salesman_id);
        console.log('   - Salesman Name:', invoice.salesman_name);
        console.log('   - Net Amount:', invoice.net_amount);
        console.log('   - Items Count:', invoice.items?.length || 0);
        console.log('\n📦 INVOICE ITEMS:', JSON.stringify(invoice.items, null, 2));
        
        // 🆕 STEP 2-SPECIAL: Check which items already have delivery challans
        console.log('\n🔍 CHECKING FOR EXISTING DELIVERY CHALLANS...');
        await checkExistingDeliveryItems(id, invoice.items || []);
        
        console.log('\n🏪 SETTING SHOP DETAILS:');
        const shopInfo = {
          name: invoice.shop_name,
          address: invoice.shop_address,
          city: invoice.shop_city,
          contact: invoice.shop_contact || invoice.shop_phone,
          owner: invoice.shop_owner || invoice.shop_owner_name
        };
        console.log('   - Name:', shopInfo.name);
        console.log('   - Address:', shopInfo.address);
        console.log('   - City:', shopInfo.city);
        console.log('   - Contact:', shopInfo.contact);
        console.log('   - Owner:', shopInfo.owner);
        setShopDetails(shopInfo);
        
        console.log('\n🔄 STEP 2A: MAPPING INVOICE ITEMS TO DELIVERY ITEMS');
        console.log('-'.repeat(60));
        
        // Map invoice items to delivery items WITH complete pricing breakdown
        const deliveryItems = (invoice.items || []).map((item, index) => {
          console.log(`\n   Item ${index + 1}:`);
          console.log('   - product_id:', item.product_id);
          console.log('   - product_name:', item.product_name);
          console.log('   - quantity:', item.quantity);
          console.log('   - unit_price:', item.unit_price);
          console.log('   - discount_percentage:', item.discount_percentage);
          console.log('   - discount_amount:', item.discount_amount);
          console.log('   - total_amount:', item.total_amount);
          
          // Calculate missing values if not present
          const quantity = parseFloat(item.quantity) || 0;
          const unitPrice = parseFloat(item.unit_price) || 0;
          const discountPercentage = parseFloat(item.discount_percentage) || 0;
          const discountAmount = parseFloat(item.discount_amount) || 0;
          
          // Gross amount (before discount)
          const grossAmount = quantity * unitPrice;
          
          // Net amount (after discount, before tax)
          const netAmount = parseFloat(item.total_amount) || (grossAmount - discountAmount);
          
          // Tax calculation (if invoice has tax, apply proportionally)
          // Note: Invoice tax is typically applied at header level, not per item
          // But we'll store it proportionally for delivery tracking
          const taxPercentage = 0; // Will be calculated from invoice header if needed
          const taxAmount = 0;
          
          const mapped = {
            product_id: item.product_id,
            product_name: item.product_name,
            product_code: item.product_code,
            quantity_ordered: quantity,
            quantity_delivered: quantity,
            unit: item.unit || 'pcs',
            unit_price: unitPrice,
            discount_percentage: discountPercentage,
            discount_amount: discountAmount,
            tax_percentage: taxPercentage,
            tax_amount: taxAmount,
            total_price: grossAmount, // Gross amount
            net_amount: netAmount // Net amount after discount
          };
          
          console.log('   ✅ Mapped to (with pricing breakdown):', JSON.stringify(mapped, null, 2));
          return mapped;
        });
        
        console.log('\n✅ ALL ITEMS MAPPED SUCCESSFULLY WITH COMPLETE PRICING');
        console.log('   Total Items:', deliveryItems.length);
        console.log('   Full Array:', JSON.stringify(deliveryItems, null, 2));
        
        console.log('\n🔄 STEP 2B: UPDATING STATE');
        console.log('-'.repeat(60));
        console.log('Setting items...');
        setItems(deliveryItems);
        console.log('Items set successfully');
        
        console.log('\n🔄 STEP 2C: UPDATING FORM DATA');
        console.log('-'.repeat(60));
        const newFormData = {
          source_type: 'invoice',
          source_id: id,
          invoice_id: invoice.id,
          order_id: invoice.order_id || null,
          shop_id: invoice.shop_id || null,
          shop_name: invoice.shop_name || null,
          shop_address: invoice.shop_address || null,
          shop_contact: invoice.shop_phone || invoice.shop_contact || null,
          route_id: invoice.route_id || null,
          route_name: invoice.route_name || null,
          salesman_id: invoice.salesman_id || null,
          salesman_name: invoice.salesman_name || null
        };
        
        console.log('📝 Form Data to be merged:');
        console.log('   - invoice_id:', newFormData.invoice_id);
        console.log('   - order_id:', newFormData.order_id);
        console.log('   - shop_id:', newFormData.shop_id);
        console.log('   - shop_name:', newFormData.shop_name);
        console.log('   - route_id:', newFormData.route_id);
        console.log('   - route_name:', newFormData.route_name);
        console.log('   - salesman_id:', newFormData.salesman_id);
        console.log('   - salesman_name:', newFormData.salesman_name);
        console.log('   Full Object:', JSON.stringify(newFormData, null, 2));
        
        setFormData(prev => ({
          ...prev,
          ...newFormData
        }));
        
        // Update searchResults with the full invoice data (this ensures sidebar shows correct info)
        const fullInvoiceData = {
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date,
          net_amount: invoice.net_amount,
          order_number: invoice.order_number,
          order_date: invoice.order_date,
          total_amount: invoice.net_amount,
          id: invoice.id
        };
        console.log('\n🔄 STEP 2D: UPDATING SEARCH RESULTS WITH FULL DATA');
        console.log('   - Invoice Number:', fullInvoiceData.invoice_number);
        console.log('   - Invoice Date:', fullInvoiceData.invoice_date);
        console.log('   - Net Amount:', fullInvoiceData.net_amount);
        setSearchResults(fullInvoiceData);
        
        // Extract and store invoice-level charges (tax, shipping, other charges, discount)
        console.log('\n🔄 STEP 2E: EXTRACTING INVOICE-LEVEL CHARGES AND DISCOUNTS');
        console.log('-'.repeat(60));
        const charges = {
          subtotal: parseFloat(invoice.subtotal) || 0,
          discount_percentage: parseFloat(invoice.discount_percentage) || 0,
          discount_amount: parseFloat(invoice.discount_amount) || 0,
          tax_percentage: parseFloat(invoice.tax_percentage) || 0,
          tax_amount: parseFloat(invoice.tax_amount) || 0,
          shipping_charges: parseFloat(invoice.shipping_charges) || 0,
          other_charges: parseFloat(invoice.other_charges) || 0,
          round_off: parseFloat(invoice.round_off) || 0,
          grand_total: parseFloat(invoice.net_amount) || 0
        };
        console.log('   Invoice Charges:');
        console.log('   - Subtotal:', charges.subtotal);
        console.log('   - Discount (', charges.discount_percentage, '%):', charges.discount_amount);
        console.log('   - Tax (', charges.tax_percentage, '%):', charges.tax_amount);
        console.log('   - Shipping Charges:', charges.shipping_charges);
        console.log('   - Other Charges:', charges.other_charges);
        console.log('   - Round Off:', charges.round_off);
        console.log('   - GRAND TOTAL:', charges.grand_total);
        setInvoiceCharges(charges);
        
        // Select all items by default when loading invoice
        setSelectedItems(new Set(deliveryItems.map((_, index) => index)));
        
        console.log('✅ Form data updated successfully');
        console.log('✅ Search results updated with full invoice data');
        console.log('✅ Invoice charges extracted and stored');
        console.log('✅ All items selected by default for delivery');
      }
    } catch (error) {
      console.error('\n❌ ERROR IN loadSourceData:');
      console.error('   - Message:', error.message);
      console.error('   - Stack:', error.stack);
      setMessage({ type: 'error', text: 'Failed to load source data' });
    } finally {
      setIsSearching(false);
      console.log('='.repeat(60));
      console.log('📦 STEP 2: SOURCE DATA LOADING COMPLETE');
      console.log('='.repeat(60) + '\n');
    }
  };

  // 🆕 Check which items already have delivery challans created
  const checkExistingDeliveryItems = async (invoiceId, invoiceItems) => {
    try {
      console.log('\n' + '='.repeat(80));
      console.log('🔍 CHECKING EXISTING DELIVERY CHALLANS');
      console.log('='.repeat(80));
      console.log('📋 Invoice ID:', invoiceId);
      console.log('📦 Total invoice items:', invoiceItems.length);
      invoiceItems.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.product_name} (ID: ${item.product_id})`);
      });
      
      // Use dedicated endpoint that returns deliveries WITH items
      console.log('\n📤 Calling API: deliveryService.getDeliveriesByInvoice()');
      const deliveriesResponse = await deliveryService.getDeliveriesByInvoice(invoiceId);
      
      console.log('📥 API Response:');
      console.log('   Success:', deliveriesResponse.success);
      console.log('   Deliveries found:', deliveriesResponse.data?.length || 0);
      
      if (!deliveriesResponse.success || !deliveriesResponse.data || deliveriesResponse.data.length === 0) {
        console.log('   ✅ No existing challans found - all items are NEW');
        console.log('='.repeat(80) + '\n');
        setItemsWithChallan(new Set());
        return;
      }
      
      const deliveries = deliveriesResponse.data;
      console.log('\n📦 FOUND', deliveries.length, 'EXISTING CHALLAN(S):');
      
      // Collect all product_ids that have been delivered
      const deliveredProductIds = new Set();
      let totalDeliveredItems = 0;
      
      deliveries.forEach((delivery, idx) => {
        console.log(`\n   Challan ${idx + 1}:`, delivery.challan_number);
        console.log('      Status:', delivery.status);
        console.log('      Created:', delivery.created_at);
        console.log('      Items:', delivery.items?.length || 0);
        
        if (delivery.items && Array.isArray(delivery.items)) {
          delivery.items.forEach(item => {
            deliveredProductIds.add(item.product_id);
            totalDeliveredItems++;
            console.log(`         - ${item.product_name} (Product ID: ${item.product_id})`);
          });
        } else {
          console.log('         ⚠️ No items array in delivery!');
        }
      });
      
      console.log('\n📊 SUMMARY:');
      console.log('   Total unique products with challans:', deliveredProductIds.size);
      console.log('   Total delivery line items:', totalDeliveredItems);
      console.log('   Products:', Array.from(deliveredProductIds).join(', '));
      
      // Map product IDs to item indices in the invoice items array
      console.log('\n🔄 MAPPING TO INVOICE ITEM INDICES:');
      const itemIndicesWithChallan = new Set();
      
      invoiceItems.forEach((item, index) => {
        if (deliveredProductIds.has(item.product_id)) {
          itemIndicesWithChallan.add(index);
          console.log(`   ✅ Index ${index}: ${item.product_name} (ID: ${item.product_id}) → HAS CHALLAN`);
        } else {
          console.log(`   ⭕ Index ${index}: ${item.product_name} (ID: ${item.product_id}) → NEW`);
        }
      });
      
      console.log('\n🎯 RESULT:');
      console.log('   Total items with existing challans:', itemIndicesWithChallan.size);
      console.log('   Indices:', Array.from(itemIndicesWithChallan).join(', '));
      
      setItemsWithChallan(itemIndicesWithChallan);
      
      // Show popup if there are items with existing challans
      if (itemIndicesWithChallan.size > 0) {
        console.log('\n🔔 SHOWING POPUP: Admin will see informative message');
        setShowChallanInfoPopup(true);
      } else {
        console.log('\n   ℹ️ No matching items found - popup will not show');
      }
      
      console.log('='.repeat(80) + '\n');
      
    } catch (error) {
      console.error('\n❌ ERROR CHECKING EXISTING DELIVERY ITEMS:');
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
      console.log('   ⚠️ Continuing with empty itemsWithChallan set');
      console.log('='.repeat(80) + '\n');
      // Don't throw - continue with normal flow
      setItemsWithChallan(new Set());
    }
  };

  // Handle invoice selection from dropdown
  const handleInvoiceSelection = async (e) => {
    const invoiceId = e.target.value;
    setSelectedInvoiceId(invoiceId);
    
    if (invoiceId) {
      console.log('📋 Invoice selected from dropdown:', invoiceId);
      await loadSourceData('invoice', invoiceId);
    } else {
      // Clear form if no invoice selected
      clearForm();
    }
  };

  // Toggle item selection for partial delivery
  const toggleItemSelection = (index) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      console.log('📦 Item', index + 1, newSet.has(index) ? 'selected' : 'deselected');
      console.log('📦 Total selected items:', newSet.size, '/', items.length);
      return newSet;
    });
  };

  // Select/deselect all items
  const toggleAllItems = () => {
    if (selectedItems.size === items.length) {
      // Deselect all
      setSelectedItems(new Set());
      console.log('📦 All items deselected');
    } else {
      // Select all
      setSelectedItems(new Set(items.map((_, index) => index)));
      console.log('📦 All items selected');
    }
  };

  const handleSearch = async () => {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 STEP 1: STARTING INVOICE SEARCH');
    console.log('='.repeat(60));
    
    if (!searchNumber.trim()) {
      console.log('❌ Error: Empty search number');
      setMessage({ type: 'error', text: 'Please enter invoice number' });
      return;
    }
    
    try {
      setIsSearching(true);
      setMessage({ type: '', text: '' });
      
      console.log('📝 Search Type: invoice');
      console.log('📝 Search Number:', searchNumber.trim());
      console.log('📤 Calling invoiceService.getAllInvoices()...');
      
      // Search by invoice number
      const response = await invoiceService.getAllInvoices({ 
        invoice_number: searchNumber.trim() 
      });
      
      console.log('📥 Search Response Received:');
      console.log('   - Success:', response.success);
      console.log('   - Data Count:', response.data?.length || 0);
      console.log('   - Full Response:', JSON.stringify(response, null, 2));
      
      if (response.data && response.data.length > 0) {
        const invoice = response.data[0];
        
        // ⚠️ CRITICAL VALIDATION
        console.log('\n⚠️ SEARCH RESULT VALIDATION:');
        console.log('   - Searched for:', searchNumber.trim());
        console.log('   - Found Invoice Number:', invoice.invoice_number);
        if (searchNumber.trim().toUpperCase() !== invoice.invoice_number.toUpperCase()) {
          console.error('❌❌❌ MISMATCH! Searched for ' + searchNumber.trim() + ' but got ' + invoice.invoice_number);
        } else {
          console.log('   ✅ Invoice numbers match - correct invoice found');
        }
        
        console.log('\n✅ Invoice Found!');
        console.log('   - ID:', invoice.id);
        console.log('   - Number:', invoice.invoice_number);
        console.log('   - Shop ID:', invoice.shop_id);
        console.log('   - Shop Name:', invoice.shop_name);
        console.log('   - Route ID:', invoice.route_id);
        console.log('   - Salesman ID:', invoice.salesman_id);
        console.log('   - Net Amount:', invoice.net_amount);
        console.log('   - Full Invoice:', JSON.stringify(invoice, null, 2));
        
        console.log('\n📤 Calling loadSourceData with ID:', invoice.id);
        await loadSourceData('invoice', invoice.id);
      } else {
        console.log('❌ No invoice found in response');
        setMessage({ type: 'error', text: 'Invoice not found' });
      }
    } catch (error) {
      console.error('❌ SEARCH ERROR:', error);
      console.error('   - Message:', error.message);
      console.error('   - Stack:', error.stack);
      setMessage({ type: 'error', text: 'Search failed' });
    } finally {
      setIsSearching(false);
      console.log('='.repeat(60));
      console.log('🔍 STEP 1: SEARCH COMPLETE');
      console.log('='.repeat(60) + '\n');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Calculate delivery summary based on SELECTED items only
   * Uses MANUAL charges if enabled, otherwise proportionally distributes invoice charges
   */
  const calculateDeliverySummary = () => {
    // Calculate selected items subtotal
    const selectedSubtotal = items
      .filter((_, i) => selectedItems.has(i))
      .reduce((sum, item) => sum + parseFloat(item.net_amount || 0), 0);
    
    // If no items selected, return zeros
    if (selectedSubtotal === 0) {
      return {
        subtotal: 0,
        discount_percentage: invoiceCharges.discount_percentage || 0,
        discount_amount: 0,
        tax_percentage: invoiceCharges.tax_percentage || 0,
        tax_amount: 0,
        shipping_charges: 0,
        other_charges: 0,
        round_off: 0,
        grand_total: 0,
        isManual: manualCharges.enabled
      };
    }
    
    // Use MANUAL charges if enabled, otherwise calculate proportional charges
    let finalDiscount, finalTax, finalShipping, finalOther, finalRoundOff;
    
    if (manualCharges.enabled) {
      // Use manually entered charges (parse as float, default to 0)
      finalDiscount = parseFloat(manualCharges.discount_amount) || 0;
      finalTax = parseFloat(manualCharges.tax_amount) || 0;
      finalShipping = parseFloat(manualCharges.shipping_charges) || 0;
      finalOther = parseFloat(manualCharges.other_charges) || 0;
      finalRoundOff = parseFloat(manualCharges.round_off) || 0;
    } else {
      // Calculate proportional charges based on selected items ratio
      if (invoiceCharges.subtotal === 0) {
        finalDiscount = finalTax = finalShipping = finalOther = finalRoundOff = 0;
      } else {
        const ratio = selectedSubtotal / invoiceCharges.subtotal;
        finalDiscount = invoiceCharges.discount_amount * ratio;
        finalTax = invoiceCharges.tax_amount * ratio;
        finalShipping = invoiceCharges.shipping_charges * ratio;
        finalOther = invoiceCharges.other_charges * ratio;
        finalRoundOff = invoiceCharges.round_off * ratio;
      }
    }
    
    // Calculate grand total: subtotal - discount + tax + shipping + other + roundoff
    const grandTotal = selectedSubtotal - finalDiscount + finalTax + finalShipping + finalOther + finalRoundOff;
    
    return {
      subtotal: selectedSubtotal,
      discount_percentage: invoiceCharges.discount_percentage || 0,
      discount_amount: finalDiscount,
      tax_percentage: invoiceCharges.tax_percentage || 0,
      tax_amount: finalTax,
      shipping_charges: finalShipping,
      other_charges: finalOther,
      round_off: finalRoundOff,
      grand_total: grandTotal,
      isManual: manualCharges.enabled
    };
  };

  const validateForm = () => {
    if (!formData.warehouse_id) {
      setMessage({ type: 'error', text: 'Please select a warehouse' });
      return false;
    }
    
    if (!formData.source_id) {
      setMessage({ type: 'error', text: 'Please search and select an invoice/order' });
      return false;
    }
    
    if (items.length === 0) {
      setMessage({ type: 'error', text: 'No items to deliver' });
      return false;
    }
    
    if (!formData.driver_name.trim()) {
      setMessage({ type: 'error', text: 'Please enter driver name' });
      return false;
    }
    
    if (!formData.driver_phone.trim()) {
      setMessage({ type: 'error', text: 'Please enter driver phone' });
      return false;
    }
    
    if (!formData.vehicle_number.trim()) {
      setMessage({ type: 'error', text: 'Please enter vehicle number' });
      return false;
    }
    
    return true;
  };

  const handleGenerateChallan = async () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 STEP 3: GENERATING DELIVERY CHALLAN');
    console.log('='.repeat(60));
    
    if (!validateForm()) {
      console.log('❌ Validation failed');
      return;
    }
    
    console.log('✅ Validation passed');
    
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      
      console.log('\n📋 CURRENT FORM DATA:');
      console.log('   - warehouse_id:', formData.warehouse_id);
      console.log('   - source_type:', formData.source_type);
      console.log('   - source_id:', formData.source_id);
      console.log('   - invoice_id:', formData.invoice_id);
      console.log('   - order_id:', formData.order_id);
      console.log('   - shop_id:', formData.shop_id);
      console.log('   - shop_name:', formData.shop_name);
      console.log('   - shop_address:', formData.shop_address);
      console.log('   - shop_contact:', formData.shop_contact);
      console.log('   - route_id:', formData.route_id);
      console.log('   - route_name:', formData.route_name);
      console.log('   - salesman_id:', formData.salesman_id);
      console.log('   - salesman_name:', formData.salesman_name);
      console.log('   - driver_name:', formData.driver_name);
      console.log('   - driver_phone:', formData.driver_phone);
      console.log('   - vehicle_number:', formData.vehicle_number);
      console.log('   Full Object:', JSON.stringify(formData, null, 2));
      
      // Filter only selected items for partial delivery
      const selectedItemsArray = items.filter((_, index) => selectedItems.has(index));
      
      console.log('\n📦 SELECTED ITEMS FOR DELIVERY:');
      console.log('   - Total items in invoice:', items.length);
      console.log('   - Items selected for delivery:', selectedItemsArray.length);
      selectedItemsArray.forEach((item, index) => {
        console.log(`   Item ${index + 1}:`);
        console.log('      - product_id:', item.product_id);
        console.log('      - product_name:', item.product_name);
        console.log('      - quantity_ordered:', item.quantity_ordered);
        console.log('      - unit_price:', item.unit_price);
        console.log('      - total_price:', item.total_price);
      });
      console.log('   Full Array:', JSON.stringify(selectedItemsArray, null, 2));
      
      // Validate at least one item is selected
      if (selectedItemsArray.length === 0) {
        setMessage({ type: 'error', text: 'Please select at least one item for delivery' });
        console.log('❌ No items selected');
        setLoading(false);
        return;
      }
      
      console.log('\n📤 SENDING TO BACKEND...');
      console.log('   Endpoint: POST /desktop/deliveries');
      console.log('   Payload: {delivery: formData, items: selectedItemsArray}');
      
      // Calculate proportional charges based on SELECTED items only
      const deliverySummary = calculateDeliverySummary();
      
      // Include calculated delivery charges (proportional if partial delivery)
      const deliveryDataWithCharges = {
        ...formData,
        subtotal: deliverySummary.subtotal,
        tax_percentage: deliverySummary.tax_percentage,
        tax_amount: deliverySummary.tax_amount,
        shipping_charges: deliverySummary.shipping_charges,
        other_charges: deliverySummary.other_charges,
        round_off: deliverySummary.round_off,
        grand_total: deliverySummary.grand_total
      };
      
      console.log('\n💰 DELIVERY CHARGES (Based on Selected Items):');
      console.log('   - Selected Items:', selectedItemsArray.length, '/', items.length);
      console.log('   - Subtotal:', deliverySummary.subtotal.toFixed(2));
      console.log('   - Tax:', deliverySummary.tax_amount.toFixed(2));
      console.log('   - Shipping:', deliverySummary.shipping_charges.toFixed(2));
      console.log('   - Other Charges:', deliverySummary.other_charges.toFixed(2));
      console.log('   - Round Off:', deliverySummary.round_off.toFixed(2));
      console.log('   - GRAND TOTAL:', deliverySummary.grand_total.toFixed(2));
      console.log('   - Is Partial Delivery:', selectedItemsArray.length < items.length);
      
      const response = await deliveryService.createDelivery(deliveryDataWithCharges, selectedItemsArray);
      
      console.log('\n📥 RESPONSE RECEIVED:');
      console.log('   - Success:', response.success);
      console.log('   - Message:', response.message);
      console.log('   - Data:', JSON.stringify(response.data, null, 2));
      console.log('\n✅ CHALLAN CREATED SUCCESSFULLY!');
      console.log('   - Challan Number:', response.data.challan_number);
      console.log('   - ID:', response.data.id);
      
      setMessage({ 
        type: 'success', 
        text: `Delivery challan ${response.data.challan_number} generated successfully!` 
      });
      
      console.log('\n🎉 SUCCESS MESSAGE DISPLAYED');
      console.log('   Redirecting to delivery tracking in 2 seconds...');
      
      // Redirect to tracking page after 2 seconds
      setTimeout(() => {
        console.log('🔄 Navigating to /deliveries');
        navigate('/deliveries', { 
          state: { newChallanId: response.data.id } 
        });
      }, 2000);
      
    } catch (error) {
      console.error('\n❌ ERROR GENERATING CHALLAN:');
      console.error('   - Message:', error.message);
      console.error('   - Response Data:', error.response?.data);
      console.error('   - Response Status:', error.response?.status);
      console.error('   - Full Error:', error);
      console.error('   - Stack:', error.stack);
      
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to generate challan' 
      });
    } finally {
      setLoading(false);
      console.log('='.repeat(60));
      console.log('🚀 STEP 3: CHALLAN GENERATION COMPLETE');
      console.log('='.repeat(60) + '\n');
    }
  };

  const handlePrintPreview = () => {
    if (items.length === 0) {
      setMessage({ type: 'error', text: 'No items to print' });
      return;
    }

    // Prepare challan data for PDF
    const deliverySummary = calculateDeliverySummary();
    const selectedItemsArray = items.filter((_, index) => selectedItems.has(index));
    
    const challanData = {
      challan_number: 'PREVIEW',
      delivery_date: formData.delivery_date,
      warehouse_name: warehouses.find(w => w.id === parseInt(formData.warehouse_id))?.name || 'N/A',
      shop_name: formData.shop_name || shopDetails?.name || 'N/A',
      shop_address: formData.shop_address || shopDetails?.address || 'N/A',
      shop_contact: formData.shop_contact || shopDetails?.phone || 'N/A',
      route_name: formData.route_name || 'N/A',
      driver_name: formData.driver_name || 'N/A',
      driver_phone: formData.driver_phone || 'N/A',
      vehicle_number: formData.vehicle_number || 'N/A',
      vehicle_type: formData.vehicle_type || 'truck',
      invoice_number: searchResults?.invoice_number || '',
      items: selectedItemsArray,
      subtotal: deliverySummary.subtotal,
      discount_percentage: deliverySummary.discount_percentage,
      discount_amount: deliverySummary.discount_amount,
      tax_percentage: deliverySummary.tax_percentage,
      tax_amount: deliverySummary.tax_amount,
      shipping_charges: deliverySummary.shipping_charges,
      other_charges: deliverySummary.other_charges,
      round_off: deliverySummary.round_off,
      grand_total: deliverySummary.grand_total,
      notes: formData.notes,
      status: 'draft'
    };

    // Use real company settings
    console.log('🖨️ Print preview with company settings state:', companySettings);
    const companyInfo = companySettings || {
      name: 'Distribution Management System',
      address: '123 Business Street, City, Country',
      phone: '+92-XXX-XXXXXXX',
      email: 'info@company.com'
    };
    console.log('📄 Company info for PDF:', companyInfo);

    printChallanPDF(challanData, companyInfo);
    setMessage({ type: 'success', text: 'PDF preview opened in new window' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleDownloadPDF = () => {
    if (items.length === 0) {
      setMessage({ type: 'error', text: 'No items to download' });
      return;
    }

    const deliverySummary = calculateDeliverySummary();
    const selectedItemsArray = items.filter((_, index) => selectedItems.has(index));
    
    const challanData = {
      challan_number: 'PREVIEW',
      delivery_date: formData.delivery_date,
      warehouse_name: warehouses.find(w => w.id === parseInt(formData.warehouse_id))?.name || 'N/A',
      shop_name: formData.shop_name || shopDetails?.name || 'N/A',
      shop_address: formData.shop_address || shopDetails?.address || 'N/A',
      shop_contact: formData.shop_contact || shopDetails?.phone || 'N/A',
      route_name: formData.route_name || 'N/A',
      driver_name: formData.driver_name || 'N/A',
      driver_phone: formData.driver_phone || 'N/A',
      vehicle_number: formData.vehicle_number || 'N/A',
      vehicle_type: formData.vehicle_type || 'truck',
      invoice_number: searchResults?.invoice_number || '',
      items: selectedItemsArray,
      subtotal: deliverySummary.subtotal,
      discount_percentage: deliverySummary.discount_percentage,
      discount_amount: deliverySummary.discount_amount,
      tax_percentage: deliverySummary.tax_percentage,
      tax_amount: deliverySummary.tax_amount,
      shipping_charges: deliverySummary.shipping_charges,
      other_charges: deliverySummary.other_charges,
      round_off: deliverySummary.round_off,
      grand_total: deliverySummary.grand_total,
      notes: formData.notes,
      status: 'draft'
    };

    console.log('💾 Download PDF with company settings state:', companySettings);
    const companyInfo = companySettings || {
      name: 'Distribution Management System',
      address: '123 Business Street, City, Country',
      phone: '+92-XXX-XXXXXXX',
      email: 'info@company.com'
    };
    console.log('📄 Company info for PDF:', companyInfo);

    downloadChallanPDF(challanData, companyInfo);
    setMessage({ type: 'success', text: 'PDF downloaded successfully' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const clearForm = () => {
    setSearchNumber('');
    setSearchResults(null);
    setItems([]);
    setSelectedItems(new Set());
    setItemsWithChallan(new Set());
    setShowChallanInfoPopup(false);
    setSelectedInvoiceId('');
    setShopDetails(null);
    setInvoiceCharges({
      subtotal: 0,
      discount_percentage: 0,
      discount_amount: 0,
      tax_percentage: 0,
      tax_amount: 0,
      shipping_charges: 0,
      other_charges: 0,
      round_off: 0,
      grand_total: 0
    });
    setManualCharges({
      enabled: false,
      discount_amount: '',
      tax_amount: '',
      shipping_charges: '',
      other_charges: '',
      round_off: ''
    });
    setFormData({
      warehouse_id: formData.warehouse_id, // Keep warehouse selection
      source_type: 'invoice',
      source_id: '',
      delivery_date: new Date().toISOString().split('T')[0],
      driver_name: '',
      driver_phone: '',
      driver_cnic: '',
      vehicle_number: '',
      vehicle_type: 'truck',
      notes: '',
      status: 'pending'
    });
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Truck className="h-8 w-8 text-blue-600" />
              Generate Delivery Challan
            </h1>
            <p className="text-gray-600 mt-2">
              Create delivery challan from invoice or order
            </p>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : message.type === 'info'
            ? 'bg-blue-50 border border-blue-200 text-blue-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      {/* 🆕 Partial Challan Info Popup */}
      {showChallanInfoPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8 animate-fadeIn">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Partial Challan Detected
                </h3>
                <p className="text-gray-600">
                  This invoice has some products with existing delivery challans
                </p>
              </div>
              <button
                onClick={() => setShowChallanInfoPopup(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-bold text-red-800 mb-1">What does this mean?</h4>
                    <p className="text-sm text-red-700">
                      Products with <span className="font-bold">RED checkboxes</span> already have delivery challans created. 
                      These items were delivered in previous partial challans.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-bold text-blue-800 mb-1">Can I create another challan for these products?</h4>
                    <p className="text-sm text-blue-700">
                      <span className="font-bold">Yes!</span> You can click on the RED checkboxes to include those products in a new challan. 
                      This is useful for repeat deliveries or corrections.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-bold text-green-800 mb-1">What should I do now?</h4>
                    <ul className="text-sm text-green-700 space-y-1 mt-2">
                      <li>• <span className="font-medium">Review the table:</span> Check which items have RED checkboxes</li>
                      <li>• <span className="font-medium">Select remaining items:</span> Choose products that need delivery</li>
                      <li>• <span className="font-medium">Or re-add existing items:</span> Click RED checkboxes if needed</li>
                      <li>• <span className="font-medium">Create challan:</span> Proceed with creating a new delivery challan</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowChallanInfoPopup(false)}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
              >
                Got It, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Invoice Selection & Source Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Invoice Selection Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Source Invoice</h2>
            
            <div className="space-y-4">
              {!showManualSearch ? (
                <>
                  {/* Invoice Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Invoice
                    </label>
                    <select
                      value={selectedInvoiceId}
                      onChange={handleInvoiceSelection}
                      disabled={loadingInvoices}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">-- Select Invoice --</option>
                      {availableInvoices.map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>
                          {invoice.invoice_number} - {invoice.shop_name} 
                          {invoice.delivery_status && ` [${invoice.delivery_status}]`}
                          {' '}(Rs. {parseFloat(invoice.net_amount || 0).toFixed(2)})
                        </option>
                      ))}
                    </select>
                    {loadingInvoices && (
                      <p className="text-sm text-gray-500 mt-1">Loading invoices...</p>
                    )}
                    {!loadingInvoices && availableInvoices.length === 0 && (
                      <p className="text-sm text-amber-600 mt-1">No invoices available for delivery</p>
                    )}
                  </div>

                  {/* Manual Search Toggle */}
                  <button
                    onClick={() => setShowManualSearch(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Search className="h-4 w-4" />
                    Search manually instead
                  </button>
                </>
              ) : (
                <>
                  {/* Manual Invoice Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invoice Number
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchNumber}
                        onChange={(e) => setSearchNumber(e.target.value)}
                        placeholder="INV-20250124-0001"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      />
                      <button
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {isSearching ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          <Search className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Back to Dropdown Toggle */}
                  <button
                    onClick={() => {
                      setShowManualSearch(false);
                      setSearchNumber('');
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to invoice list
                  </button>
                </>
              )}

              {searchResults && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Document Found</span>
                    <button
                      onClick={clearForm}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-1 text-sm text-blue-800">
                    <p><strong>Number:</strong> {searchResults.invoice_number || searchResults.order_number}</p>
                    <p><strong>Date:</strong> {new Date(searchResults.invoice_date || searchResults.order_date).toLocaleDateString()}</p>
                    <p><strong>Amount:</strong> Rs. {parseFloat(searchResults.net_amount || searchResults.total_amount || 0).toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Shop Details */}
          {shopDetails && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Delivery Address
              </h2>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-gray-900">{shopDetails.name}</p>
                {shopDetails.address && <p className="text-gray-600">{shopDetails.address}</p>}
                {shopDetails.city && <p className="text-gray-600">{shopDetails.city}</p>}
                {shopDetails.contact && (
                  <p className="text-gray-600 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {shopDetails.contact}
                  </p>
                )}
                {shopDetails.owner && <p className="text-gray-600">Contact: {shopDetails.owner}</p>}
              </div>
            </div>
          )}

          {/* Warehouse Selection */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Warehouse</h2>
            <select
              name="warehouse_id"
              value={formData.warehouse_id}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Warehouse</option>
              {warehouses.map(warehouse => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} {warehouse.is_default && '(Default)'}
                </option>
              ))}
            </select>
          </div>

          {/* Invoice Items Reference Table (Left Sidebar) */}
          {searchResults && searchResults.items && searchResults.items.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Invoice Items ({searchResults.items.length})
              </h2>
              <div className="text-xs text-gray-500 mb-3 p-2 bg-green-50 border border-green-200 rounded">
                <strong>Reference:</strong> Original invoice items with pricing details
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Gross</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Disc</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Net</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {searchResults.items.map((item, index) => {
                      const qty = parseFloat(item.quantity) || 0;
                      const unitPrice = parseFloat(item.unit_price) || 0;
                      const grossAmount = qty * unitPrice;
                      const discountAmount = parseFloat(item.discount_amount) || 0;
                      const netAmount = parseFloat(item.total_amount) || (grossAmount - discountAmount);
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-2 py-2 text-xs text-gray-900">{index + 1}</td>
                          <td className="px-2 py-2 text-xs text-gray-900">
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-gray-500">{item.product_code}</div>
                          </td>
                          <td className="px-2 py-2 text-xs text-right text-gray-900">
                            {qty.toFixed(2)}
                          </td>
                          <td className="px-2 py-2 text-xs text-right text-gray-900">
                            {unitPrice.toFixed(2)}
                          </td>
                          <td className="px-2 py-2 text-xs text-right text-gray-900">
                            {grossAmount.toFixed(2)}
                          </td>
                          <td className="px-2 py-2 text-xs text-right text-red-600">
                            {discountAmount > 0 ? discountAmount.toFixed(2) : '-'}
                            {item.discount_percentage > 0 && (
                              <div className="text-[10px] text-gray-500">({item.discount_percentage}%)</div>
                            )}
                          </td>
                          <td className="px-2 py-2 text-xs text-right font-medium text-gray-900">
                            {netAmount.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="4" className="px-2 py-2 text-xs font-semibold text-gray-900">
                        Total
                      </td>
                      <td className="px-2 py-2 text-xs text-right font-bold text-gray-900">
                        {searchResults.items.reduce((sum, item) => {
                          const qty = parseFloat(item.quantity) || 0;
                          const unitPrice = parseFloat(item.unit_price) || 0;
                          return sum + (qty * unitPrice);
                        }, 0).toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-xs text-right font-bold text-red-600">
                        {searchResults.items.reduce((sum, item) => 
                          sum + (parseFloat(item.discount_amount) || 0), 0).toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-xs text-right font-bold text-blue-600">
                        {searchResults.items.reduce((sum, item) => {
                          const qty = parseFloat(item.quantity) || 0;
                          const unitPrice = parseFloat(item.unit_price) || 0;
                          const gross = qty * unitPrice;
                          const discount = parseFloat(item.discount_amount) || 0;
                          return sum + (gross - discount);
                        }, 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Delivery Details & Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Details */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Date *
                </label>
                <input
                  type="date"
                  name="delivery_date"
                  value={formData.delivery_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Type
                </label>
                <select
                  name="vehicle_type"
                  value={formData.vehicle_type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="truck">Truck</option>
                  <option value="van">Van</option>
                  <option value="pickup">Pickup</option>
                  <option value="motorcycle">Motorcycle</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver Name *
                </label>
                <input
                  type="text"
                  name="driver_name"
                  value={formData.driver_name}
                  onChange={handleInputChange}
                  placeholder="Enter driver name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver Phone *
                </label>
                <input
                  type="tel"
                  name="driver_phone"
                  value={formData.driver_phone}
                  onChange={handleInputChange}
                  placeholder="03XX-XXXXXXX"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver CNIC
                </label>
                <input
                  type="text"
                  name="driver_cnic"
                  value={formData.driver_cnic}
                  onChange={handleInputChange}
                  placeholder="XXXXX-XXXXXXX-X"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Number *
                </label>
                <input
                  type="text"
                  name="vehicle_number"
                  value={formData.vehicle_number}
                  onChange={handleInputChange}
                  placeholder="ABC-123"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="Additional notes or instructions..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Items to Deliver ({selectedItems.size}/{items.length} selected)
                </h2>
                
                {/* Item Stats Badges */}
                {items.length > 0 && itemsWithChallan.size > 0 && (
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full flex items-center gap-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      {itemsWithChallan.size} With Challan
                    </span>
                    {itemsWithChallan.size < items.length && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        {items.length - itemsWithChallan.size} New
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {items.length > 0 && (
                <button
                  onClick={toggleAllItems}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {selectedItems.size === items.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
            
            {items.length > 0 ? (
              <>
                {/* Partial Delivery Info */}
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Partial Delivery:</strong> Select only the items you want to deliver now. 
                    You can create additional challans later for remaining items.
                  </p>
                </div>

                {/* Red Tick Legend - Only show if there are items with existing challans */}
                {itemsWithChallan.size > 0 && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-lg shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-red-900 mb-2 flex items-center gap-2">
                          🔴 RED Checkboxes = Challan Already Created
                        </h4>
                        <div className="text-sm text-red-800 space-y-1">
                          <p>
                            • Products with <span className="font-bold">RED checkboxes</span> already have delivery challans
                          </p>
                          <p>
                            • These were delivered in <span className="font-bold">previous partial deliveries</span>
                          </p>
                          <p className="font-bold text-red-900">
                            • You can still select them again if you need to create another challan for the same products
                          </p>
                        </div>
                        <button
                          onClick={() => setShowChallanInfoPopup(true)}
                          className="mt-2 text-xs font-medium text-red-700 hover:text-red-900 underline"
                        >
                          Show detailed explanation
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-12">
                          Select
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Discount</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item, index) => {
                        const grossAmount = parseFloat(item.total_price || 0);
                        const discountAmount = parseFloat(item.discount_amount || 0);
                        const netAmount = parseFloat(item.net_amount || 0);
                        const hasExistingChallan = itemsWithChallan.has(index);
                        const isSelected = selectedItems.has(index);
                        
                        return (
                        <tr 
                          key={index} 
                          className={`hover:bg-gray-50 transition-colors ${
                            isSelected 
                              ? hasExistingChallan 
                                ? 'bg-red-50 border-l-4 border-red-500' 
                                : 'bg-blue-50'
                              : hasExistingChallan 
                                ? 'bg-red-25' 
                                : ''
                          }`}
                        >
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleItemSelection(index)}
                                className={`h-4 w-4 focus:ring-2 border-2 rounded cursor-pointer transition-all ${
                                  hasExistingChallan
                                    ? 'text-red-600 border-red-500 focus:ring-red-500 bg-red-50'
                                    : 'text-blue-600 border-gray-300 focus:ring-blue-500'
                                }`}
                              />
                              {hasExistingChallan && (
                                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">
                                  Exists
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              {item.product_name}
                              {hasExistingChallan && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-300">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                  Challan Created
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{item.product_code}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">
                            {parseFloat(item.quantity_ordered || 0).toFixed(2)} {item.unit}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">
                            Rs. {parseFloat(item.unit_price || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">
                            Rs. {grossAmount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-red-600">
                            {discountAmount > 0 ? `- Rs. ${discountAmount.toFixed(2)}` : '-'}
                            {item.discount_percentage > 0 && (
                              <span className="text-xs block text-gray-500">({item.discount_percentage}%)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                            Rs. {netAmount.toFixed(2)}
                          </td>
                        </tr>
                      )})}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="6" className="px-4 py-3 text-sm font-semibold text-gray-900">
                          Total (Selected Items)
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                          Rs. {items.filter((_, i) => selectedItems.has(i))
                            .reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0)
                            .toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-red-600">
                          - Rs. {items.filter((_, i) => selectedItems.has(i))
                            .reduce((sum, item) => sum + parseFloat(item.discount_amount || 0), 0)
                            .toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-blue-600">
                          Rs. {items.filter((_, i) => selectedItems.has(i))
                            .reduce((sum, item) => sum + parseFloat(item.net_amount || 0), 0)
                            .toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No items loaded</p>
                <p className="text-sm text-gray-400 mt-1">Select an invoice from the dropdown above</p>
              </div>
            )}
          </div>

          {/* Manual Charges Override Section */}
          {items.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 border-2 border-orange-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">Manual Charges</h2>
                  <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                    Optional Override
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualCharges.enabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      if (enabled) {
                        // Pre-fill with calculated proportional values
                        const summary = calculateDeliverySummary();
                        setManualCharges({
                          enabled: true,
                          discount_amount: summary.discount_amount.toFixed(2),
                          tax_amount: summary.tax_amount.toFixed(2),
                          shipping_charges: summary.shipping_charges.toFixed(2),
                          other_charges: summary.other_charges.toFixed(2),
                          round_off: summary.round_off.toFixed(2)
                        });
                      } else {
                        setManualCharges({
                          enabled: false,
                          discount_amount: '',
                          tax_amount: '',
                          shipping_charges: '',
                          other_charges: '',
                          round_off: ''
                        });
                      }
                    }}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {manualCharges.enabled ? 'Enabled' : 'Enable Manual Entry'}
                  </span>
                </label>
              </div>

              {manualCharges.enabled && (
                <>
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                      <strong>⚠️ Manual Mode Active:</strong> You can now edit charges manually. The grand total will update automatically based on your entries.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Discount Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Discount Amount (Rs.)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={manualCharges.discount_amount}
                        onChange={(e) => setManualCharges(prev => ({
                          ...prev,
                          discount_amount: e.target.value
                        }))}
                        placeholder="0.00"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Original: Rs. {invoiceCharges.discount_amount.toFixed(2)} ({invoiceCharges.discount_percentage}%)
                      </p>
                    </div>

                    {/* Tax Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tax Amount (Rs.)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={manualCharges.tax_amount}
                        onChange={(e) => setManualCharges(prev => ({
                          ...prev,
                          tax_amount: e.target.value
                        }))}
                        placeholder="0.00"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Original: Rs. {invoiceCharges.tax_amount.toFixed(2)} ({invoiceCharges.tax_percentage}%)
                      </p>
                    </div>

                    {/* Shipping Charges */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shipping Charges (Rs.)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={manualCharges.shipping_charges}
                        onChange={(e) => setManualCharges(prev => ({
                          ...prev,
                          shipping_charges: e.target.value
                        }))}
                        placeholder="0.00"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Original: Rs. {invoiceCharges.shipping_charges.toFixed(2)}
                      </p>
                    </div>

                    {/* Other Charges */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Other Charges (Rs.)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={manualCharges.other_charges}
                        onChange={(e) => setManualCharges(prev => ({
                          ...prev,
                          other_charges: e.target.value
                        }))}
                        placeholder="0.00"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Original: Rs. {invoiceCharges.other_charges.toFixed(2)}
                      </p>
                    </div>

                    {/* Round Off */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Round Off (Rs.)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={manualCharges.round_off}
                        onChange={(e) => setManualCharges(prev => ({
                          ...prev,
                          round_off: e.target.value
                        }))}
                        placeholder="0.00"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Original: Rs. {invoiceCharges.round_off.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => {
                        const summary = calculateDeliverySummary();
                        setManualCharges({
                          enabled: true,
                          discount_amount: summary.discount_amount.toFixed(2),
                          tax_amount: summary.tax_amount.toFixed(2),
                          shipping_charges: summary.shipping_charges.toFixed(2),
                          other_charges: summary.other_charges.toFixed(2),
                          round_off: summary.round_off.toFixed(2)
                        });
                      }}
                      className="px-4 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
                    >
                      Reset to Proportional
                    </button>
                    <button
                      onClick={() => {
                        setManualCharges({
                          enabled: true,
                          discount_amount: invoiceCharges.discount_amount.toFixed(2),
                          tax_amount: invoiceCharges.tax_amount.toFixed(2),
                          shipping_charges: invoiceCharges.shipping_charges.toFixed(2),
                          other_charges: invoiceCharges.other_charges.toFixed(2),
                          round_off: invoiceCharges.round_off.toFixed(2)
                        });
                      }}
                      className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                    >
                      Use Full Invoice Charges
                    </button>
                  </div>
                </>
              )}

              {!manualCharges.enabled && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Enable manual entry to customize charges for this delivery challan
                </div>
              )}
            </div>
          )}

          {/* Pricing Summary - Shows invoice-level charges DYNAMICALLY based on selected items */}
          {invoiceCharges.grand_total > 0 && (() => {
            const deliverySummary = calculateDeliverySummary();
            const isPartialDelivery = selectedItems.size < items.length;
            const isManualCharges = deliverySummary.isManual;
            
            return (
              <div className={`rounded-lg shadow-md p-6 border-2 ${isManualCharges ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-300' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'}`}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className={`h-5 w-5 ${isManualCharges ? 'text-orange-600' : 'text-blue-600'}`} />
                  Delivery Challan Summary 
                  {isPartialDelivery && <span className="text-xs font-normal text-blue-600">(Partial Delivery)</span>}
                  {isManualCharges && (
                    <span className="px-2 py-1 text-xs font-medium bg-orange-200 text-orange-800 rounded">
                      Manual Charges
                    </span>
                  )}
                </h2>
                
                {isManualCharges && (
                  <div className="mb-3 p-2 bg-orange-100 border border-orange-300 rounded text-xs text-orange-900 font-medium">
                    ✏️ <strong>Manual charges applied:</strong> Charges have been manually entered and will override automatic calculations
                  </div>
                )}
                
                {isPartialDelivery && !isManualCharges && (
                  <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    <strong>Note:</strong> Charges are proportionally calculated based on {selectedItems.size} of {items.length} selected items
                  </div>
                )}
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-blue-200">
                    <span className="text-sm font-medium text-gray-700">Items Subtotal:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      Rs. {deliverySummary.subtotal.toFixed(2)}
                    </span>
                  </div>
                  
                  {deliverySummary.discount_amount > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-blue-200">
                      <span className="text-sm font-medium text-gray-700">
                        Discount ({deliverySummary.discount_percentage.toFixed(2)}%):
                      </span>
                      <span className="text-sm font-semibold text-red-600">
                        - Rs. {deliverySummary.discount_amount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center py-2 border-b border-blue-200">
                    <span className="text-sm font-medium text-gray-700">
                      Tax ({deliverySummary.tax_percentage.toFixed(2)}%):
                    </span>
                    <span className={`text-sm font-semibold ${deliverySummary.tax_amount > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                      {deliverySummary.tax_amount > 0 ? '+ ' : ''}Rs. {deliverySummary.tax_amount.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-blue-200">
                    <span className="text-sm font-medium text-gray-700">Shipping Charges:</span>
                    <span className={`text-sm font-semibold ${deliverySummary.shipping_charges > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                      {deliverySummary.shipping_charges > 0 ? '+ ' : ''}Rs. {deliverySummary.shipping_charges.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-blue-200">
                    <span className="text-sm font-medium text-gray-700">Other Charges:</span>
                    <span className={`text-sm font-semibold ${deliverySummary.other_charges > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                      {deliverySummary.other_charges > 0 ? '+ ' : ''}Rs. {deliverySummary.other_charges.toFixed(2)}
                    </span>
                  </div>
                  
                  {deliverySummary.round_off !== 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-blue-200">
                      <span className="text-sm font-medium text-gray-700">Round Off:</span>
                      <span className={`text-sm font-semibold ${deliverySummary.round_off > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {deliverySummary.round_off > 0 ? '+' : ''} Rs. {deliverySummary.round_off.toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center py-3 bg-blue-100 rounded-lg px-4 mt-4">
                    <span className="text-base font-bold text-gray-900">GRAND TOTAL:</span>
                    <span className="text-xl font-bold text-blue-600">
                      Rs. {deliverySummary.grand_total.toFixed(2)}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-600 text-center mt-3 italic">
                    {isManualCharges 
                      ? '⚠️ Custom charges have been manually entered by admin'
                      : isPartialDelivery 
                        ? 'Proportional charges applied for selected items only'
                        : 'This amount includes all items, taxes, and charges from the invoice'
                    }
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => navigate('/deliveries')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handleDownloadPDF}
              disabled={items.length === 0}
              className="flex items-center gap-2 px-6 py-3 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-5 w-5" />
              Download PDF
            </button>
            
            <button
              onClick={handlePrintPreview}
              disabled={items.length === 0}
              className="flex items-center gap-2 px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="h-5 w-5" />
              Print PDF
            </button>
            
            <button
              onClick={handleGenerateChallan}
              disabled={loading || items.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5" />
                  Generate Challan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryChallanPage;
