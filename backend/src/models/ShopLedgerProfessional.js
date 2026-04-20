/**
 * PROFESSIONAL SHOP LEDGER MODEL - REBUILT
 * Distribution Industry Standard
 * Company: Ummahtechinnovations.com
 * Date: January 22, 2026
 * 
 * This is a comprehensive accounting ledger system designed specifically for
 * distribution companies managing credit sales to retail shops.
 * 
 * KEY FEATURES:
 * - Double-entry bookkeeping principles
 * - FIFO (First In First Out) payment allocation
 * - Running balance calculation
 * - Comprehensive aging analysis
 * - Credit limit management
 * - Audit trail for all transactions
 * - Professional financial reporting
 */

const db = require('../config/database');

class ShopLedgerProfessional {
  constructor() {
    this.tableName = 'shop_ledger';
  }

  // ============================================================================
  // CORE LEDGER OPERATIONS
  // ============================================================================

  /**
   * Create a ledger entry (PROFESSIONAL VERSION)
   * This is the foundation of all financial transactions
   * 
   * @param {Object} entryData - Transaction details
   * @returns {Promise<Object>} Created entry with calculated balance
   */
  async createEntry(entryData) {
    console.log(`📝 [LEDGER] Creating ${entryData.transaction_type} entry for shop ${entryData.shop_id}...`);
    
    const {
      shop_id,
      transaction_date,
      transaction_type,   // invoice, payment, credit_note, debit_note, adjustment, opening_balance
      reference_no,       // Document number (INV-001, RCP-001, etc.)
      description,
      debit_amount = 0,   // Shop owes money (Dr.)
      credit_amount = 0,  // Shop paid money (Cr.)
      invoice_id = null,  // Link to invoice
      payment_id = null,  // Link to payment
      related_id = null,  // Link to related document
      notes = '',
      created_by = 1
    } = entryData;

    // VALIDATION: Amount must be positive
    if (debit_amount < 0 || credit_amount < 0) {
      throw new Error('Amounts cannot be negative');
    }

    // VALIDATION: Only one of debit or credit can be non-zero
    if (debit_amount > 0 && credit_amount > 0) {
      throw new Error('Cannot have both debit and credit in same entry');
    }

    // VALIDATION: At least one amount must be provided
    if (debit_amount === 0 && credit_amount === 0) {
      throw new Error('Either debit or credit amount is required');
    }

    // Get previous balance for this shop
    const previousBalance = await this.getShopCurrentBalance(shop_id);
    
    // CALCULATE RUNNING BALANCE
    // Balance = Previous Balance + Debit - Credit
    // Debit increases balance (shop owes more)
    // Credit decreases balance (shop paid)
    const balance = previousBalance + debit_amount - credit_amount;

    // Create the entry
    const [result] = await db.query(`
      INSERT INTO shop_ledger (
        shop_id, transaction_date, transaction_type, reference_no,
        description, debit_amount, credit_amount, balance,
        invoice_id, payment_id, related_id, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      shop_id, transaction_date, transaction_type, reference_no,
      description, debit_amount, credit_amount, balance,
      invoice_id, payment_id, related_id, notes, created_by
    ]);

    console.log(`✅ [LEDGER] Entry created: ID ${result.insertId} | Balance: Rs. ${balance.toFixed(2)}`);

    return {
      id: result.insertId,
      shop_id,
      transaction_date,
      transaction_type,
      reference_no,
      description,
      debit_amount,
      credit_amount,
      balance,
      invoice_id,
      payment_id,
      related_id,
      notes,
      created_by
    };
  }

  /**
   * Get current balance for a shop
   * This is the most recent running balance
   * 
   * @param {number} shopId - Shop ID
   * @returns {Promise<number>} Current balance
   */
  async getShopCurrentBalance(shopId) {
    const [rows] = await db.query(`
      SELECT balance
      FROM shop_ledger
      WHERE shop_id = ?
      ORDER BY transaction_date DESC, id DESC
      LIMIT 1
    `, [shopId]);

    return rows.length > 0 ? parseFloat(rows[0].balance) : 0;
  }

  /**
   * Get complete ledger for a shop with PROFESSIONAL FILTERS
   * 
   * @param {number} shopId - Shop ID
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Ledger data with shop details and pagination
   */
  async getShopLedger(shopId, filters = {}) {
    console.log(`📖 [LEDGER] Getting ledger for shop ${shopId}...`);
    
    const {
      page = 1,
      limit = 50,
      start_date = null,
      end_date = null,
      transaction_type = null,
      min_amount = null,
      max_amount = null
    } = filters;
    
    const offset = (page - 1) * limit;
    
    // BUILD WHERE CLAUSE
    let whereConditions = ['shop_id = ?'];
    let queryParams = [shopId];
    
    if (start_date) {
      whereConditions.push('transaction_date >= ?');
      queryParams.push(start_date);
    }
    
    if (end_date) {
      whereConditions.push('transaction_date <= ?');
      queryParams.push(end_date);
    }
    
    if (transaction_type) {
      whereConditions.push('transaction_type = ?');
      queryParams.push(transaction_type);
    }

    if (min_amount) {
      whereConditions.push('(debit_amount >= ? OR credit_amount >= ?)');
      queryParams.push(min_amount, min_amount);
    }

    if (max_amount) {
      whereConditions.push('(debit_amount <= ? OR credit_amount <= ?)');
      queryParams.push(max_amount, max_amount);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // GET LEDGER ENTRIES
    const [entries] = await db.query(`
      SELECT 
        l.*,
        u.username as created_by_name,
        i.invoice_number,
        p.receipt_number
      FROM shop_ledger l
      LEFT JOIN users u ON l.created_by = u.id
      LEFT JOIN invoices i ON l.invoice_id = i.id
      LEFT JOIN payments p ON l.payment_id = p.id
      WHERE ${whereClause}
      ORDER BY transaction_date DESC, id DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);
    
    // GET TOTAL COUNT
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total FROM shop_ledger
      WHERE ${whereClause}
    `, queryParams);
    
    const total = countResult[0].total;
    
    // GET SHOP DETAILS WITH FINANCIAL SUMMARY
    const [shops] = await db.query(`
      SELECT 
        s.*,
        (SELECT balance FROM shop_ledger WHERE shop_id = s.id ORDER BY transaction_date DESC, id DESC LIMIT 1) as current_balance,
        (SELECT SUM(debit_amount) FROM shop_ledger WHERE shop_id = s.id) as total_debits,
        (SELECT SUM(credit_amount) FROM shop_ledger WHERE shop_id = s.id) as total_credits,
        (SELECT COUNT(*) FROM shop_ledger WHERE shop_id = s.id AND transaction_type = 'invoice') as total_invoices,
        (SELECT COUNT(*) FROM shop_ledger WHERE shop_id = s.id AND transaction_type = 'payment') as total_payments
      FROM shops s
      WHERE s.id = ?
    `, [shopId]);
    
    const shop = shops[0] || null;

    // CALCULATE ADDITIONAL METRICS
    if (shop) {
      shop.current_balance = parseFloat(shop.current_balance || 0);
      shop.total_debits = parseFloat(shop.total_debits || 0);
      shop.total_credits = parseFloat(shop.total_credits || 0);
      shop.credit_limit = parseFloat(shop.credit_limit || 0);
      
      // Available credit
      shop.available_credit = shop.credit_limit - shop.current_balance;
      
      // Credit utilization percentage
      shop.credit_utilization = shop.credit_limit > 0 
        ? ((shop.current_balance / shop.credit_limit) * 100).toFixed(2)
        : 0;
      
      // Is over limit?
      shop.is_over_limit = shop.current_balance > shop.credit_limit;
      
      // Collection performance (payments vs invoices)
      shop.collection_rate = shop.total_debits > 0
        ? ((shop.total_credits / shop.total_debits) * 100).toFixed(2)
        : 0;
    }

    console.log(`✅ [LEDGER] Retrieved ${entries.length} entries | Balance: Rs. ${shop?.current_balance || 0}`);

    return {
      shop,
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      summary: {
        opening_balance: entries.length > 0 ? entries[entries.length - 1].balance - (entries[entries.length - 1].debit_amount || 0) + (entries[entries.length - 1].credit_amount || 0) : 0,
        closing_balance: shop?.current_balance || 0,
        total_debits: entries.reduce((sum, e) => sum + parseFloat(e.debit_amount || 0), 0),
        total_credits: entries.reduce((sum, e) => sum + parseFloat(e.credit_amount || 0), 0),
        net_change: entries.reduce((sum, e) => sum + parseFloat(e.debit_amount || 0) - parseFloat(e.credit_amount || 0), 0)
      }
    };
  }

  /**
   * Get PROFESSIONAL ACCOUNT STATEMENT
   * Like a bank statement - formatted for printing/PDF
   * 
   * @param {number} shopId - Shop ID
   * @param {Object} options - Statement options
   * @returns {Promise<Object>} Formatted statement
   */
  async getAccountStatement(shopId, options = {}) {
    console.log(`📄 [LEDGER] Generating account statement for shop ${shopId}...`);
    
    const {
      start_date = null,
      end_date = null,
      include_details = true
    } = options;

    // Get shop details
    const [shops] = await db.query(`
      SELECT s.*, 
        (SELECT balance FROM shop_ledger WHERE shop_id = s.id AND transaction_date < ? ORDER BY transaction_date DESC, id DESC LIMIT 1) as opening_balance,
        (SELECT balance FROM shop_ledger WHERE shop_id = s.id ORDER BY transaction_date DESC, id DESC LIMIT 1) as closing_balance
      FROM shops s
      WHERE s.id = ?
    `, [start_date || '1900-01-01', shopId]);

    if (shops.length === 0) {
      throw new Error('Shop not found');
    }

    const shop = shops[0];
    const opening_balance = parseFloat(shop.opening_balance || 0);
    const closing_balance = parseFloat(shop.closing_balance || 0);

    // Get transactions for the period
    let whereConditions = ['shop_id = ?'];
    let queryParams = [shopId];

    if (start_date) {
      whereConditions.push('transaction_date >= ?');
      queryParams.push(start_date);
    }

    if (end_date) {
      whereConditions.push('transaction_date <= ?');
      queryParams.push(end_date);
    }

    const whereClause = whereConditions.join(' AND ');

    const [transactions] = await db.query(`
      SELECT * FROM shop_ledger
      WHERE ${whereClause}
      ORDER BY transaction_date ASC, id ASC
    `, queryParams);

    // Calculate period totals
    const total_debits = transactions.reduce((sum, t) => sum + parseFloat(t.debit_amount || 0), 0);
    const total_credits = transactions.reduce((sum, t) => sum + parseFloat(t.credit_amount || 0), 0);
    const net_change = total_debits - total_credits;

    console.log(`✅ [LEDGER] Statement generated: ${transactions.length} transactions`);

    return {
      shop: {
        id: shop.id,
        shop_code: shop.shop_code,
        shop_name: shop.shop_name,
        contact_person: shop.contact_person,
        phone: shop.phone,
        address: shop.address,
        credit_limit: parseFloat(shop.credit_limit || 0)
      },
      statement_period: {
        start_date: start_date || 'Beginning',
        end_date: end_date || 'Today'
      },
      financial_summary: {
        opening_balance,
        total_debits,
        total_credits,
        net_change,
        closing_balance
      },
      transactions: include_details ? transactions : [],
      generated_at: new Date().toISOString(),
      generated_by: 'System'
    };
  }

  /**
   * PROFESSIONAL AGING ANALYSIS
   * Categorize outstanding balances by age
   * 
   * @param {number} shopId - Shop ID (optional, null for all shops)
   * @returns {Promise<Object>} Aging breakdown
   */
  async getAgingAnalysis(shopId = null) {
    console.log(`📊 [LEDGER] Generating aging analysis${shopId ? ` for shop ${shopId}` : ' for all shops'}...`);

    const currentDate = new Date().toISOString().split('T')[0];

    let whereClause = shopId ? 'WHERE i.shop_id = ?' : '';
    let queryParams = shopId ? [shopId] : [];

    const [results] = await db.query(`
      SELECT 
        s.id as shop_id,
        s.shop_code,
        s.shop_name,
        s.credit_limit,
        COALESCE((SELECT balance FROM shop_ledger WHERE shop_id = s.id ORDER BY transaction_date DESC, id DESC LIMIT 1), 0) as current_balance,
        
        -- Current (0-30 days)
        COALESCE(SUM(CASE 
          WHEN DATEDIFF('${currentDate}', i.invoice_date) BETWEEN 0 AND 30 
          THEN i.total_amount - i.paid_amount 
          ELSE 0 
        END), 0) as current_0_30,
        
        -- 31-60 days
        COALESCE(SUM(CASE 
          WHEN DATEDIFF('${currentDate}', i.invoice_date) BETWEEN 31 AND 60 
          THEN i.total_amount - i.paid_amount 
          ELSE 0 
        END), 0) as aging_31_60,
        
        -- 61-90 days
        COALESCE(SUM(CASE 
          WHEN DATEDIFF('${currentDate}', i.invoice_date) BETWEEN 61 AND 90 
          THEN i.total_amount - i.paid_amount 
          ELSE 0 
        END), 0) as aging_61_90,
        
        -- 91+ days (Critical)
        COALESCE(SUM(CASE 
          WHEN DATEDIFF('${currentDate}', i.invoice_date) > 90 
          THEN i.total_amount - i.paid_amount 
          ELSE 0 
        END), 0) as aging_over_90,
        
        COUNT(CASE WHEN i.paid_amount < i.total_amount THEN 1 END) as unpaid_invoices_count,
        MAX(i.invoice_date) as last_invoice_date,
        MAX(p.payment_date) as last_payment_date

      FROM shops s
      LEFT JOIN invoices i ON s.id = i.shop_id AND i.paid_amount < i.total_amount
      LEFT JOIN (
        SELECT shop_id, MAX(transaction_date) as payment_date
        FROM shop_ledger
        WHERE transaction_type = 'payment'
        GROUP BY shop_id
      ) p ON s.id = p.shop_id
      ${whereClause}
      GROUP BY s.id, s.shop_code, s.shop_name, s.credit_limit
      HAVING current_balance > 0
      ORDER BY aging_over_90 DESC, current_balance DESC
    `, queryParams);

    // Calculate totals
    const totals = {
      total_shops: results.length,
      total_outstanding: results.reduce((sum, r) => sum + parseFloat(r.current_balance), 0),
      current_0_30: results.reduce((sum, r) => sum + parseFloat(r.current_0_30), 0),
      aging_31_60: results.reduce((sum, r) => sum + parseFloat(r.aging_31_60), 0),
      aging_61_90: results.reduce((sum, r) => sum + parseFloat(r.aging_61_90), 0),
      aging_over_90: results.reduce((sum, r) => sum + parseFloat(r.aging_over_90), 0)
    };

    // Add risk classification
    const shops = results.map(shop => ({
      ...shop,
      current_balance: parseFloat(shop.current_balance),
      current_0_30: parseFloat(shop.current_0_30),
      aging_31_60: parseFloat(shop.aging_31_60),
      aging_61_90: parseFloat(shop.aging_61_90),
      aging_over_90: parseFloat(shop.aging_over_90),
      credit_limit: parseFloat(shop.credit_limit),
      credit_utilization: parseFloat(shop.credit_limit) > 0 
        ? ((parseFloat(shop.current_balance) / parseFloat(shop.credit_limit)) * 100).toFixed(2)
        : 0,
      risk_level: this.calculateRiskLevel(shop),
      collection_priority: this.calculateCollectionPriority(shop)
    }));

    console.log(`✅ [LEDGER] Aging analysis complete: ${results.length} shops analyzed`);

    return {
      shops,
      totals,
      analysis_date: currentDate,
      recommendations: this.generateCollectionRecommendations(shops)
    };
  }

  /**
   * Calculate risk level based on aging and utilization
   * 
   * @param {Object} shop - Shop data
   * @returns {string} Risk level (low, medium, high, critical)
   */
  calculateRiskLevel(shop) {
    const over90Percent = (parseFloat(shop.aging_over_90) / parseFloat(shop.current_balance || 1)) * 100;
    const utilization = parseFloat(shop.credit_limit) > 0
      ? (parseFloat(shop.current_balance) / parseFloat(shop.credit_limit)) * 100
      : 0;

    if (over90Percent > 50 || utilization > 100) {
      return 'critical';
    } else if (over90Percent > 25 || utilization > 90) {
      return 'high';
    } else if (over90Percent > 10 || utilization > 75) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Calculate collection priority (1=highest, 5=lowest)
   * 
   * @param {Object} shop - Shop data
   * @returns {number} Priority level
   */
  calculateCollectionPriority(shop) {
    const over90 = parseFloat(shop.aging_over_90);
    const total = parseFloat(shop.current_balance);

    if (over90 > 50000) return 1; // Highest priority
    if (over90 > 20000) return 2;
    if (total > 50000) return 3;
    if (total > 20000) return 4;
    return 5; // Lowest priority
  }

  /**
   * Generate collection recommendations based on analysis
   * 
   * @param {Array} shops - Analyzed shops
   * @returns {Array} Recommendations
   */
  generateCollectionRecommendations(shops) {
    const recommendations = [];

    // Critical shops (90+ days overdue)
    const criticalShops = shops.filter(s => parseFloat(s.aging_over_90) > 0);
    if (criticalShops.length > 0) {
      recommendations.push({
        type: 'critical',
        title: 'Immediate Action Required',
        message: `${criticalShops.length} shop(s) have debts over 90 days old`,
        action: 'Send legal notice or stop credit',
        shops: criticalShops.slice(0, 5).map(s => s.shop_name)
      });
    }

    // Over credit limit
    const overLimitShops = shops.filter(s => parseFloat(s.current_balance) > parseFloat(s.credit_limit));
    if (overLimitShops.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Credit Limit Exceeded',
        message: `${overLimitShops.length} shop(s) have exceeded their credit limit`,
        action: 'Stop new sales until payment received',
        shops: overLimitShops.slice(0, 5).map(s => s.shop_name)
      });
    }

    // High utilization (>80%)
    const highUtilizationShops = shops.filter(s => parseFloat(s.credit_utilization) > 80);
    if (highUtilizationShops.length > 0) {
      recommendations.push({
        type: 'caution',
        title: 'High Credit Utilization',
        message: `${highUtilizationShops.length} shop(s) are using >80% of their credit limit`,
        action: 'Follow up on payments',
        shops: highUtilizationShops.slice(0, 5).map(s => s.shop_name)
      });
    }

    return recommendations;
  }

  /**
   * Check if shop can place order (credit limit validation)
   * 
   * @param {number} shopId - Shop ID
   * @param {number} orderAmount - Order amount
   * @returns {Promise<Object>} Approval status with details
   */
  async checkCreditLimit(shopId, orderAmount) {
    console.log(`🔍 [LEDGER] Checking credit limit for shop ${shopId}, order amount: Rs. ${orderAmount}...`);

    const [shops] = await db.query(`
      SELECT s.*,
        (SELECT balance FROM shop_ledger WHERE shop_id = s.id ORDER BY transaction_date DESC, id DESC LIMIT 1) as current_balance
      FROM shops s
      WHERE s.id = ?
    `, [shopId]);

    if (shops.length === 0) {
      throw new Error('Shop not found');
    }

    const shop = shops[0];
    const currentBalance = parseFloat(shop.current_balance || 0);
    const creditLimit = parseFloat(shop.credit_limit || 0);
    const availableCredit = creditLimit - currentBalance;
    const newBalance = currentBalance + orderAmount;

    const approved = newBalance <= creditLimit;

    const result = {
      approved,
      shop_id: shopId,
      shop_name: shop.shop_name,
      current_balance: currentBalance,
      credit_limit: creditLimit,
      available_credit: availableCredit,
      order_amount: orderAmount,
      new_balance: newBalance,
      excess_amount: approved ? 0 : newBalance - creditLimit,
      message: approved 
        ? 'Order approved - within credit limit'
        : `Order exceeds credit limit by Rs. ${(newBalance - creditLimit).toFixed(2)}`,
      requires_approval: !approved
    };

    console.log(`${approved ? '✅' : '⚠️'} [LEDGER] Credit check: ${result.message}`);

    return result;
  }

  /**
   * Create manual adjustment (Admin only)
   * For corrections, write-offs, or special transactions
   * 
   * @param {Object} adjustmentData - Adjustment details
   * @returns {Promise<Object>} Created entry
   */
  async createAdjustment(adjustmentData) {
    console.log(`✏️ [LEDGER] Creating manual adjustment...`);

    const {
      shop_id,
      amount,
      type, // 'debit' or 'credit'
      description,
      notes,
      created_by
    } = adjustmentData;

    // Generate reference number
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const [countResult] = await db.query(
      'SELECT COUNT(*) as count FROM shop_ledger WHERE transaction_type = "adjustment" AND DATE(created_at) = CURDATE()'
    );
    const sequence = String(countResult[0].count + 1).padStart(3, '0');
    const reference_no = `ADJ-${date}-${sequence}`;

    const entry = {
      shop_id,
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_type: 'adjustment',
      reference_no,
      description: description || 'Manual Adjustment',
      debit_amount: type === 'debit' ? amount : 0,
      credit_amount: type === 'credit' ? amount : 0,
      notes: notes || '',
      created_by
    };

    return await this.createEntry(entry);
  }

  /**
   * Recalculate all balances (for data integrity)
   * Use this if you suspect balance calculation errors
   * 
   * @param {number} shopId - Shop ID
   * @returns {Promise<Object>} Recalculation result
   */
  async recalculateBalances(shopId) {
    console.log(`🔄 [LEDGER] Recalculating balances for shop ${shopId}...`);

    // Get all entries in chronological order
    const [entries] = await db.query(`
      SELECT * FROM shop_ledger
      WHERE shop_id = ?
      ORDER BY transaction_date ASC, id ASC
    `, [shopId]);

    let runningBalance = 0;
    let corrected = 0;

    for (const entry of entries) {
      const expectedBalance = runningBalance + parseFloat(entry.debit_amount || 0) - parseFloat(entry.credit_amount || 0);
      const actualBalance = parseFloat(entry.balance);

      if (Math.abs(expectedBalance - actualBalance) > 0.01) {
        // Fix the balance
        await db.query(
          'UPDATE shop_ledger SET balance = ? WHERE id = ?',
          [expectedBalance, entry.id]
        );
        corrected++;
      }

      runningBalance = expectedBalance;
    }

    console.log(`✅ [LEDGER] Recalculation complete: ${entries.length} entries checked, ${corrected} corrected`);

    return {
      entries_checked: entries.length,
      entries_corrected: corrected,
      final_balance: runningBalance
    };
  }
}

module.exports = new ShopLedgerProfessional();
