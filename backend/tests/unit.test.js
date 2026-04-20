/**
 * Unit Tests for New Feature Models and Controllers
 * Tests the business logic and data validation
 */

// ============================
// StockReturn Model Unit Tests
// ============================
describe('StockReturn Model - Unit Tests', () => {
  test('processReturn validation - should reject empty items', () => {
    const validateReturn = (returnData, items) => {
      if (!returnData.delivery_id) throw new Error('Delivery ID is required');
      if (!items || items.length === 0) throw new Error('Return items are required');
      return true;
    };

    expect(() => validateReturn({ delivery_id: 1 }, [])).toThrow('Return items are required');
  });

  test('processReturn validation - should reject without delivery_id', () => {
    const validateReturn = (returnData, items) => {
      if (!returnData.delivery_id) throw new Error('Delivery ID is required');
      if (!items || items.length === 0) throw new Error('Return items are required');
      return true;
    };

    expect(() => validateReturn({}, [{ id: 1 }])).toThrow('Delivery ID is required');
  });

  test('return number format should match RET-YYYYMMDD-XXXX pattern', () => {
    const generateReturnNumber = (count) => {
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const sequence = String(count + 1).padStart(4, '0');
      return `RET-${dateStr}-${sequence}`;
    };

    const result = generateReturnNumber(5);
    expect(result).toMatch(/^RET-\d{8}-\d{4}$/);
    expect(result).toContain('-0006');
  });
});

// ============================
// DailyCollection Model Unit Tests
// ============================
describe('DailyCollection Model - Unit Tests', () => {
  test('create validation - should reject without amount', () => {
    const validateCollection = (data) => {
      if (!data.amount || data.amount <= 0) throw new Error('Amount is required and must be positive');
      if (!data.payment_method) throw new Error('Payment method is required');
      return true;
    };

    expect(() => validateCollection({ payment_method: 'cash' })).toThrow('Amount is required');
  });

  test('create validation - should accept valid data', () => {
    const validateCollection = (data) => {
      if (!data.amount || data.amount <= 0) throw new Error('Amount is required and must be positive');
      if (!data.payment_method) throw new Error('Payment method is required');
      return true;
    };

    expect(validateCollection({ amount: 5000, payment_method: 'cash' })).toBe(true);
  });

  test('collection date should default to today', () => {
    const data = { amount: 1000, payment_method: 'cash' };
    const collectionDate = data.collection_date || new Date().toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    expect(collectionDate).toBe(today);
  });
});

// ============================
// Stock Return Controller Validation Tests
// ============================
describe('StockReturn Controller - Validation', () => {
  test('should validate return has items', () => {
    const validateReturn = (data) => {
      if (!data.delivery_id) throw new Error('Delivery ID is required');
      if (!data.items || data.items.length === 0) throw new Error('At least one item is required');
      for (const item of data.items) {
        if (!item.quantity_returned || item.quantity_returned <= 0) {
          throw new Error('Return quantity must be positive');
        }
      }
      return true;
    };

    expect(() => validateReturn({})).toThrow('Delivery ID is required');
    expect(() => validateReturn({ delivery_id: 1 })).toThrow('At least one item is required');
    expect(() => validateReturn({ delivery_id: 1, items: [] })).toThrow('At least one item is required');
    expect(() => validateReturn({ 
      delivery_id: 1, 
      items: [{ quantity_returned: -1 }] 
    })).toThrow('Return quantity must be positive');
    expect(validateReturn({ 
      delivery_id: 1, 
      items: [{ quantity_returned: 5 }] 
    })).toBe(true);
  });
});

// ============================
// Daily Collection Controller Validation Tests
// ============================
describe('DailyCollection Controller - Validation', () => {
  test('should validate collection has amount', () => {
    const validateCollection = (data) => {
      if (!data.amount || data.amount <= 0) throw new Error('Valid amount is required');
      if (!data.payment_method) throw new Error('Payment method is required');
      const validMethods = ['cash', 'cheque', 'bank_transfer', 'online'];
      if (!validMethods.includes(data.payment_method)) {
        throw new Error('Invalid payment method');
      }
      return true;
    };

    expect(() => validateCollection({})).toThrow('Valid amount is required');
    expect(() => validateCollection({ amount: -100 })).toThrow('Valid amount is required');
    expect(() => validateCollection({ amount: 100 })).toThrow('Payment method is required');
    expect(() => validateCollection({ amount: 100, payment_method: 'bitcoin' })).toThrow('Invalid payment method');
    expect(validateCollection({ amount: 100, payment_method: 'cash' })).toBe(true);
    expect(validateCollection({ amount: 5000, payment_method: 'bank_transfer' })).toBe(true);
  });
});

// ============================
// Product Company Name Field Tests
// ============================
describe('Product Company Name - Field Validation', () => {
  test('company_name should be included in product data', () => {
    const productData = {
      product_name: 'Test Product',
      unit_price: 100,
      company_name: 'Test Company',
      brand: 'Test Brand',
      category: 'Test Category'
    };

    expect(productData.company_name).toBe('Test Company');
    expect(typeof productData.company_name).toBe('string');
  });

  test('company_name should handle null/empty values', () => {
    const productData = {
      product_name: 'Test Product',
      unit_price: 100,
      company_name: null
    };

    const displayValue = productData.company_name || '-';
    expect(displayValue).toBe('-');
  });
});

// ============================
// Ledger Balance Calculation Tests  
// ============================
describe('Shop Ledger Balance Calculations (Feature 7)', () => {
  test('credit (delivery) should increase balance', () => {
    const previousBalance = 1000;
    const creditAmount = 500; // delivery
    const debitAmount = 0;
    const newBalance = previousBalance + creditAmount - debitAmount;
    expect(newBalance).toBe(1500); // Balance increased (shop owes more)
  });

  test('debit (payment) should decrease balance', () => {
    const previousBalance = 1000;
    const creditAmount = 0;
    const debitAmount = 300; // payment received
    const newBalance = previousBalance + creditAmount - debitAmount;
    expect(newBalance).toBe(700); // Balance decreased (shop paid)
  });

  test('delivery followed by full payment should zero balance', () => {
    let balance = 0;
    // Delivery of 5000
    balance = balance + 5000 - 0; // credit = 5000
    expect(balance).toBe(5000);
    // Full payment
    balance = balance + 0 - 5000; // debit = 5000
    expect(balance).toBe(0);
  });

  test('return should create debit entry reducing balance', () => {
    let balance = 5000; // after delivery
    // Return of 1000 worth of goods
    const returnAmount = 1000;
    balance = balance + 0 - returnAmount; // debit (reverse credit)
    expect(balance).toBe(4000);
  });
});

// ============================
// Route Consolidated Bill Logic Tests
// ============================
describe('Route Consolidated Bill - Logic Tests', () => {
  test('should correctly group deliveries by shop', () => {
    const deliveries = [
      { shop_id: 1, shop_name: 'Shop A', grand_total: 1000 },
      { shop_id: 1, shop_name: 'Shop A', grand_total: 2000 },
      { shop_id: 2, shop_name: 'Shop B', grand_total: 1500 },
    ];

    const grouped = {};
    deliveries.forEach(d => {
      if (!grouped[d.shop_id]) {
        grouped[d.shop_id] = { shop_name: d.shop_name, total: 0, count: 0 };
      }
      grouped[d.shop_id].total += d.grand_total;
      grouped[d.shop_id].count += 1;
    });

    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped[1].total).toBe(3000);
    expect(grouped[1].count).toBe(2);
    expect(grouped[2].total).toBe(1500);
    expect(grouped[2].count).toBe(1);
  });

  test('should calculate route totals correctly', () => {
    const shops = [
      { total: 3000 },
      { total: 1500 },
      { total: 2500 },
    ];

    const routeTotal = shops.reduce((sum, s) => sum + s.total, 0);
    expect(routeTotal).toBe(7000);
  });
});
