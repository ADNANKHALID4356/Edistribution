/**
 * Shop Ledger Model
 * Company: Ummahtechinnovations.com
 * Date: January 22, 2026
 * 
 * Handles all shop ledger operations including:
 * - Automatic ledger entry creation
 * - Balance calculations
 * - Account statements
 * - Payment allocations (FIFO strategy)
 * - Credit limit checking
 * - Aging analysis
 */

const db = require('../config/database');

// Database compatibility check
const useSQLite = process.env.USE_SQLITE === 'true' && process.env.NODE_ENV === 'development';

class ShopLedger {
  /**
   * Create a ledger entry (called automatically from Invoice/Payment models)
   * @param {Object} entryData - Ledger entry data
   * @param {Object} existingConnection - Optional existing database connection for transaction
   * @returns {Promise<Object>} Created ledger entry with balance
   */
  async createEntry(entryData, existingConnection = null) {
    console.log('📒 [SHOP LEDGER] Creating ledger entry...');
    console.log('📒 [SHOP LEDGER] Entry data:', JSON.stringify(entryData, null, 2));
    
    const connection = existingConnection || await db.getConnection();
    const isOwnConnection = !existingConnection;
    
    try {
      if (isOwnConnection) {
        await connection.beginTransaction();
      }
      
      // Get previous balance for this shop (most recent entry by ID for accuracy)
      const [prevEntries] = await connection.query(`
        SELECT balance FROM shop_ledger 
        WHERE shop_id = ? 
        ORDER BY id DESC 
        LIMIT 1
      `, [entryData.shop_id]);
      
      const previousBalance = prevEntries.length > 0 ? parseFloat(prevEntries[0].balance) : 0;
      
      // Calculate new balance (DEBT TRACKING SYSTEM)
      // Balance = Shop's debt/credit owed to warehouse
      // Credit (Invoice): Adds to balance (shop owes more money)
      // Debit (Payment from shop): Reduces balance (shop pays off debt)
      // Positive balance = Shop owes us money (debt)
      // Negative balance = Shop has credit with us (overpaid)
      const debitAmount = parseFloat(entryData.debit_amount) || 0;
      const creditAmount = parseFloat(entryData.credit_amount) || 0;
      const newBalance = previousBalance + creditAmount - debitAmount;
      
      console.log(`💰 Previous Balance: ${previousBalance}, Credit (Invoice): +${creditAmount}, Debit (Payment): -${debitAmount}, New Balance: ${newBalance}`);
      
      // Insert ledger entry
      const [result] = await connection.query(`
        INSERT INTO shop_ledger (
          shop_id, shop_name, transaction_date, transaction_type,
          reference_type, reference_id, reference_number,
          debit_amount, credit_amount, balance,
          description, notes, created_by, created_by_name, is_manual
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        entryData.shop_id,
        entryData.shop_name || null,
        entryData.transaction_date || new Date(),
        entryData.transaction_type,
        entryData.reference_type || null,
        entryData.reference_id || null,
        entryData.reference_number || null,
        debitAmount,
        creditAmount,
        newBalance,
        entryData.description || '',
        entryData.notes || null,
        entryData.created_by || null,
        entryData.created_by_name || null,
        entryData.is_manual || 0
      ]);
      
      // Update shop's current_balance and last_transaction_date
      await connection.query(`
        UPDATE shops 
        SET current_balance = ?, 
            last_transaction_date = ?
        WHERE id = ?
      `, [newBalance, entryData.transaction_date || new Date(), entryData.shop_id]);
      
      if (isOwnConnection) {
        await connection.commit();
        connection.release();
      }
      
      console.log(`✅ [SHOP LEDGER] Entry created for shop ${entryData.shop_id}, new balance: ${newBalance}`);
      
      return {
        id: result.insertId,
        previous_balance: previousBalance,
        new_balance: newBalance,
        ...entryData
      };
    } catch (error) {
      if (isOwnConnection) {
        await connection.rollback();
        connection.release();
      }
      console.error('❌ [SHOP LEDGER] Error creating entry:', error);
      throw error;
    }
  }
  
  /**
   * Recalculate all balances for a shop (fixes inconsistencies)
   * @param {number} shopId - Shop ID
   * @returns {Promise<Object>} Recalculation result
   */
  async recalculateBalances(shopId) {
    console.log(`🔄 [SHOP LEDGER] Recalculating balances for shop ${shopId}...`);
    
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // Get all entries for this shop ordered by date and id
      const [entries] = await connection.query(`
        SELECT id, debit_amount, credit_amount, transaction_date
        FROM shop_ledger 
        WHERE shop_id = ? 
        ORDER BY transaction_date ASC, id ASC
      `, [shopId]);
      
      let runningBalance = 0;
      let updatedCount = 0;
      
      for (const entry of entries) {
        const debit = parseFloat(entry.debit_amount) || 0;
        const credit = parseFloat(entry.credit_amount) || 0;
        // Credit (Invoice) ADDS to balance, Debit (Payment) SUBTRACTS
        runningBalance = runningBalance + credit - debit;
        
        await connection.query(
          'UPDATE shop_ledger SET balance = ? WHERE id = ?',
          [runningBalance, entry.id]
        );
        updatedCount++;
      }
      
      // Update shop's current balance
      await connection.query(
        'UPDATE shops SET current_balance = ? WHERE id = ?',
        [runningBalance, shopId]
      );
      
      await connection.commit();
      connection.release();
      
      console.log(`✅ [SHOP LEDGER] Recalculated ${updatedCount} entries. Final balance: ${runningBalance}`);
      
      return {
        shop_id: shopId,
        entries_updated: updatedCount,
        final_balance: runningBalance
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('❌ [SHOP LEDGER] Error recalculating balances:', error);
      throw error;
    }
  }
  
  /**
   * Clear transaction history for a shop (ADMIN ONLY)
   * Only removes ledger entries, preserves shop and invoice data
   * @param {number} shopId - Shop ID
   * @param {Object} options - Options like retain_opening_balance
   * @returns {Promise<Object>} Clear result
   */
  async clearTransactionHistory(shopId, options = {}) {
    console.log(`🗑️ [SHOP LEDGER] Clearing transaction history for shop ${shopId}...`);
    
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // Get shop details
      const [shops] = await connection.query(
        'SELECT * FROM shops WHERE id = ?',
        [shopId]
      );
      
      if (shops.length === 0) {
        throw new Error('Shop not found');
      }
      
      const shop = shops[0];
      
      // Get current ledger stats before clearing
      const [stats] = await connection.query(`
        SELECT 
          COUNT(*) as total_entries,
          SUM(debit_amount) as total_debits,
          SUM(credit_amount) as total_credits
        FROM shop_ledger WHERE shop_id = ?
      `, [shopId]);
      
      // Get the actual last balance (most recent entry by ID)
      const [lastEntry] = await connection.query(`
        SELECT balance FROM shop_ledger 
        WHERE shop_id = ? 
        ORDER BY id DESC LIMIT 1
      `, [shopId]);
      
      const previousStats = {
        ...stats[0],
        last_balance: lastEntry.length > 0 ? parseFloat(lastEntry[0].balance) : 0
      };
      
      // Delete all ledger entries for this shop
      const [deleteResult] = await connection.query(
        'DELETE FROM shop_ledger WHERE shop_id = ?',
        [shopId]
      );
      
      // Get the number of deleted rows
      const deletedCount = deleteResult?.affectedRows || deleteResult?.changes || parseInt(previousStats.total_entries) || 0;
      console.log(`🗑️ [SHOP LEDGER] Delete result:`, deleteResult, `Deleted count: ${deletedCount}`);
      
      // Reset shop balance to zero (or create opening balance entry if requested)
      if (options.retain_opening_balance && previousStats.last_balance !== 0) {
        // Create opening balance entry with the previous balance
        await connection.query(`
          INSERT INTO shop_ledger (
            shop_id, shop_name, transaction_date, transaction_type,
            reference_type, reference_number,
            debit_amount, credit_amount, balance,
            description, is_manual, created_at
          ) VALUES (?, ?, datetime('now'), 'opening_balance', 'system', 'OB-RESET', ?, ?, ?, 'Opening Balance after history clear', 1, datetime('now'))
        `, [
          shopId,
          shop.shop_name,
          previousStats.last_balance > 0 ? previousStats.last_balance : 0,
          previousStats.last_balance < 0 ? Math.abs(previousStats.last_balance) : 0,
          previousStats.last_balance || 0
        ]);
        
        // Also update shop's current_balance to match
        await connection.query(
          'UPDATE shops SET current_balance = ? WHERE id = ?',
          [previousStats.last_balance, shopId]
        );
        
        console.log(`📒 [SHOP LEDGER] Created opening balance entry: ${previousStats.last_balance}`);
      } else {
        // Reset shop balance to zero
        await connection.query(
          'UPDATE shops SET current_balance = 0 WHERE id = ?',
          [shopId]
        );
      }
      
      await connection.commit();
      connection.release();
      
      console.log(`✅ [SHOP LEDGER] Cleared ${deletedCount} entries for shop ${shopId}`);
      
      return {
        shop_id: shopId,
        shop_name: shop.shop_name,
        entries_deleted: deletedCount,
        previous_total_debits: previousStats.total_debits,
        previous_total_credits: previousStats.total_credits,
        previous_balance: previousStats.last_balance,
        new_balance: options.retain_opening_balance ? previousStats.last_balance : 0,
        message: 'Transaction history cleared successfully'
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('❌ [SHOP LEDGER] Error clearing history:', error);
      throw error;
    }
  }
  
  /**
   * Sync missing invoice ledger entries for a shop
   * Creates ledger entries for invoices that don't have them
   * @param {number} shopId - Shop ID
   * @returns {Promise<Object>} Sync result
   */
  async syncMissingInvoiceEntries(shopId) {
    console.log(`🔄 [SHOP LEDGER] Syncing missing invoice entries for shop ${shopId}...`);
    
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // Get shop details
      const [shops] = await connection.query('SELECT * FROM shops WHERE id = ?', [shopId]);
      if (shops.length === 0) {
        throw new Error('Shop not found');
      }
      const shop = shops[0];
      
      // Find invoices that don't have ledger entries
      const [missingInvoices] = await connection.query(`
        SELECT i.* FROM invoices i
        LEFT JOIN shop_ledger sl ON sl.reference_type = 'invoice' AND sl.reference_id = i.id
        WHERE i.shop_id = ? AND sl.id IS NULL
        ORDER BY i.invoice_date ASC, i.id ASC
      `, [shopId]);
      
      console.log(`📋 Found ${missingInvoices.length} invoices without ledger entries`);
      
      let createdCount = 0;
      
      for (const invoice of missingInvoices) {
        // Create ledger entry for this invoice
        await connection.query(`
          INSERT INTO shop_ledger (
            shop_id, shop_name, transaction_date, transaction_type,
            reference_type, reference_id, reference_number,
            debit_amount, credit_amount, balance,
            description, is_manual, created_at
          ) VALUES (?, ?, ?, 'invoice', 'invoice', ?, ?, 0, ?, 0, ?, 0, datetime('now'))
        `, [
          shopId,
          shop.shop_name,
          invoice.invoice_date,
          invoice.id,
          invoice.invoice_number,
          parseFloat(invoice.net_amount) || parseFloat(invoice.total_amount) || 0,
          `Invoice ${invoice.invoice_number}`
        ]);
        createdCount++;
      }
      
      await connection.commit();
      connection.release();
      
      // If we created entries, recalculate balances
      if (createdCount > 0) {
        console.log(`✅ Created ${createdCount} missing ledger entries, now recalculating balances...`);
        await this.recalculateBalances(shopId);
      }
      
      return {
        shop_id: shopId,
        invoices_synced: createdCount,
        message: `Synced ${createdCount} missing invoice entries`
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('❌ [SHOP LEDGER] Error syncing invoice entries:', error);
      throw error;
    }
  }
  
  /**
   * Get shop ledger with pagination and filters
   * @param {number} shopId - Shop ID
   * @param {Object} filters - Filters (page, limit, start_date, end_date, transaction_type)
   * @returns {Promise<Object>} Ledger entries with pagination
   */
  async getShopLedger(shopId, filters = {}) {
    console.log(`📒 [SHOP LEDGER] Getting ledger for shop ${shopId}...`);
    
    // Check if shop_ledger table exists (important for fresh databases)
    try {
      if (useSQLite) {
        const [tables] = await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='shop_ledger'");
        if (tables.length === 0) {
          console.log('⚠️ [SHOP LEDGER] Table does not exist yet - returning empty ledger');
          const [shops] = await db.query('SELECT * FROM shops WHERE id = ?', [shopId]);
          return {
            shop: shops[0] || null,
            entries: [],
            pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }
          };
        }
      } else {
        const [tables] = await db.query("SHOW TABLES LIKE 'shop_ledger'");
        if (tables.length === 0) {
          console.log('⚠️ [SHOP LEDGER] Table does not exist yet - returning empty ledger');
          const [shops] = await db.query('SELECT * FROM shops WHERE id = ?', [shopId]);
          return {
            shop: shops[0] || null,
            entries: [],
            pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }
          };
        }
      }
    } catch (tableCheckError) {
      console.error('⚠️ [SHOP LEDGER] Error checking table existence:', tableCheckError.message);
      // Continue anyway - let the actual query handle the error
    }
    
    const {
      page = 1,
      limit = 50,
      start_date = null,
      end_date = null,
      transaction_type = null
    } = filters;
    
    const offset = (page - 1) * limit;
    
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
    
    const whereClause = whereConditions.join(' AND ');
    
    // Get ledger entries - ORDER BY id DESC ensures newest entries (highest ID) appear first
    const [entries] = await db.query(`
      SELECT * FROM shop_ledger
      WHERE ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);
    
    // Get total count
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total FROM shop_ledger
      WHERE ${whereClause}
    `, queryParams);
    
    const total = countResult[0].total;
    
    // Get shop details - use id DESC to get the most recent balance
    const [shops] = await db.query(`
      SELECT s.*, 
        (SELECT balance FROM shop_ledger WHERE shop_id = s.id ORDER BY id DESC LIMIT 1) as current_balance
      FROM shops s
      WHERE s.id = ?
    `, [shopId]);
    
    return {
      shop: shops[0] || null,
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get account statement (formatted for printing/PDF)
   * @param {number} shopId - Shop ID
   * @param {Object} options - start_date, end_date
   * @returns {Promise<Object>} Formatted account statement
   */
  async getAccountStatement(shopId, options = {}) {
    console.log(`📄 [SHOP LEDGER] Generating account statement for shop ${shopId}...`);
    
    const { start_date, end_date } = options;
    
    // Get shop details
    const [shops] = await db.query(`
      SELECT * FROM shops WHERE id = ?
    `, [shopId]);
    
    if (shops.length === 0) {
      throw new Error('Shop not found');
    }
    
    const shop = shops[0];
    
    // Get opening balance (balance before start_date or first entry)
    let openingBalance = 0;
    if (start_date) {
      const [prevEntries] = await db.query(`
        SELECT balance FROM shop_ledger 
        WHERE shop_id = ? AND transaction_date < ?
        ORDER BY transaction_date DESC, id DESC 
        LIMIT 1
      `, [shopId, start_date]);
      
      openingBalance = prevEntries.length > 0 ? parseFloat(prevEntries[0].balance) : 0;
    }
    
    // Build query for transactions
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
    
    // Get all transactions
    const [transactions] = await db.query(`
      SELECT * FROM shop_ledger
      WHERE ${whereClause}
      ORDER BY transaction_date ASC, id ASC
    `, queryParams);
    
    // Calculate totals
    const totalDebits = transactions.reduce((sum, t) => sum + parseFloat(t.debit_amount), 0);
    const totalCredits = transactions.reduce((sum, t) => sum + parseFloat(t.credit_amount), 0);
    const closingBalance = transactions.length > 0 ? parseFloat(transactions[transactions.length - 1].balance) : openingBalance;
    
    // Get outstanding invoices
    const [outstandingInvoices] = await db.query(`
      SELECT * FROM invoices
      WHERE shop_id = ? AND status IN ('unpaid', 'partial')
      ORDER BY invoice_date ASC
    `, [shopId]);
    
    return {
      shop,
      statement_period: {
        start_date,
        end_date,
        generated_at: new Date()
      },
      opening_balance: openingBalance,
      closing_balance: closingBalance,
      total_debits: totalDebits,
      total_credits: totalCredits,
      transactions,
      outstanding_invoices: outstandingInvoices
    };
  }
  
  /**
   * Allocate payment to invoices (FIFO - First In First Out)
   * @param {number} paymentId - Payment ID
   * @param {number} shopId - Shop ID
   * @param {number} paymentAmount - Payment amount
   * @returns {Promise<Array>} Array of allocations
   */
  async allocatePayment(paymentId, shopId, paymentAmount) {
    console.log(`💰 [SHOP LEDGER] Allocating payment ${paymentId} (${paymentAmount} PKR) for shop ${shopId}...`);
    
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // Get unpaid/partial invoices for this shop (oldest first - FIFO)
      const [invoices] = await connection.query(`
        SELECT * FROM invoices
        WHERE shop_id = ? AND status IN ('unpaid', 'partial')
        ORDER BY invoice_date ASC, id ASC
      `, [shopId]);
      
      if (invoices.length === 0) {
        console.log('⚠️  No outstanding invoices found. Payment will be recorded as advance.');
        await connection.commit();
        connection.release();
        return [];
      }
      
      let remainingAmount = parseFloat(paymentAmount);
      const allocations = [];
      
      for (const invoice of invoices) {
        if (remainingAmount <= 0.01) break; // Allow for rounding errors
        
        const invoiceBalance = parseFloat(invoice.balance_amount);
        const allocationAmount = Math.min(remainingAmount, invoiceBalance);
        
        // Create allocation record
        await connection.query(`
          INSERT INTO payment_allocations (payment_id, invoice_id, allocated_amount)
          VALUES (?, ?, ?)
        `, [paymentId, invoice.id, allocationAmount]);
        
        // Update invoice paid_amount and balance_amount
        const newPaidAmount = parseFloat(invoice.paid_amount) + allocationAmount;
        const newBalance = parseFloat(invoice.net_amount) - newPaidAmount;
        
        let newStatus = 'unpaid';
        if (newBalance <= 0.01) { // Allow for rounding errors
          newStatus = 'paid';
        } else if (newPaidAmount > 0) {
          newStatus = 'partial';
        }
        
        await connection.query(`
          UPDATE invoices 
          SET paid_amount = ?, balance_amount = ?, status = ?
          WHERE id = ?
        `, [newPaidAmount, Math.max(0, newBalance), newStatus, invoice.id]);
        
        allocations.push({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date,
          invoice_amount: invoice.net_amount,
          previous_balance: invoiceBalance,
          allocated_amount: allocationAmount,
          new_balance: newBalance,
          status: newStatus
        });
        
        remainingAmount -= allocationAmount;
        
        console.log(`  ✅ Allocated ${allocationAmount} PKR to Invoice ${invoice.invoice_number}`);
      }
      
      if (remainingAmount > 0.01) {
        console.log(`⚠️  Remaining ${remainingAmount.toFixed(2)} PKR recorded as advance payment`);
      }
      
      await connection.commit();
      connection.release();
      
      console.log(`✅ [SHOP LEDGER] Payment allocated to ${allocations.length} invoices`);
      
      return allocations;
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('❌ [SHOP LEDGER] Error allocating payment:', error);
      throw error;
    }
  }

  /**
   * Allocate payment to specific invoices
   * @param {number} paymentId - Payment ID
   * @param {number} shopId - Shop ID
   * @param {number} paymentAmount - Payment amount
   * @param {Array<number>} invoiceIds - Array of invoice IDs to allocate to
   * @returns {Promise<Array>} Array of allocation details
   */
  async allocatePaymentToSpecificInvoices(paymentId, shopId, paymentAmount, invoiceIds) {
    console.log(`💰 [SHOP LEDGER] Allocating payment ${paymentId} to specific invoices: ${invoiceIds.join(', ')}`);
    
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // Get the specific invoices
      const placeholders = invoiceIds.map(() => '?').join(',');
      const [invoices] = await connection.query(`
        SELECT * FROM invoices
        WHERE shop_id = ? AND id IN (${placeholders}) AND status IN ('unpaid', 'partial')
        ORDER BY invoice_date ASC, id ASC
      `, [shopId, ...invoiceIds]);
      
      if (invoices.length === 0) {
        console.log('⚠️  No valid invoices found for allocation.');
        await connection.commit();
        connection.release();
        return [];
      }
      
      let remainingAmount = parseFloat(paymentAmount);
      const allocations = [];
      
      // Calculate total balance of selected invoices
      const totalSelectedBalance = invoices.reduce((sum, inv) => sum + parseFloat(inv.balance_amount), 0);
      
      for (const invoice of invoices) {
        if (remainingAmount <= 0.01) break;
        
        const invoiceBalance = parseFloat(invoice.balance_amount);
        
        // Allocate proportionally if payment is less than total balance
        let allocationAmount;
        if (remainingAmount >= totalSelectedBalance) {
          // Full payment - allocate full balance
          allocationAmount = invoiceBalance;
        } else {
          // Partial payment - allocate proportionally
          const proportion = invoiceBalance / totalSelectedBalance;
          allocationAmount = Math.min(remainingAmount, Math.round(paymentAmount * proportion * 100) / 100);
          allocationAmount = Math.min(allocationAmount, invoiceBalance);
        }
        
        if (allocationAmount <= 0) continue;
        
        // Create allocation record
        await connection.query(`
          INSERT INTO payment_allocations (payment_id, invoice_id, allocated_amount)
          VALUES (?, ?, ?)
        `, [paymentId, invoice.id, allocationAmount]);
        
        // Update invoice paid_amount and balance_amount
        const newPaidAmount = parseFloat(invoice.paid_amount) + allocationAmount;
        const newBalance = parseFloat(invoice.net_amount) - newPaidAmount;
        
        let newStatus = 'unpaid';
        if (newBalance <= 0.01) {
          newStatus = 'paid';
        } else if (newPaidAmount > 0) {
          newStatus = 'partial';
        }
        
        await connection.query(`
          UPDATE invoices 
          SET paid_amount = ?, balance_amount = ?, status = ?
          WHERE id = ?
        `, [newPaidAmount, Math.max(0, newBalance), newStatus, invoice.id]);
        
        allocations.push({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date,
          invoice_amount: invoice.net_amount,
          previous_balance: invoiceBalance,
          allocated_amount: allocationAmount,
          new_balance: newBalance,
          status: newStatus
        });
        
        remainingAmount -= allocationAmount;
        
        console.log(`  ✅ Allocated ${allocationAmount} PKR to Invoice ${invoice.invoice_number}`);
      }
      
      if (remainingAmount > 0.01) {
        console.log(`⚠️  Remaining ${remainingAmount.toFixed(2)} PKR recorded as advance payment`);
      }
      
      await connection.commit();
      connection.release();
      
      console.log(`✅ [SHOP LEDGER] Payment allocated to ${allocations.length} specific invoices`);
      
      return allocations;
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('❌ [SHOP LEDGER] Error allocating payment to specific invoices:', error);
      throw error;
    }
  }
  
  /**
   * Create manual adjustment entry (admin only)
   * @param {Object} adjustmentData - Adjustment details
   * @returns {Promise<Object>} Created ledger entry
   */
  async createAdjustment(adjustmentData) {
    console.log('✏️ [SHOP LEDGER] Creating manual adjustment...');
    
    // Validate required fields
    if (!adjustmentData.shop_id || !adjustmentData.amount || !adjustmentData.type) {
      throw new Error('shop_id, amount, and type (debit/credit) are required');
    }
    
    const entryData = {
      shop_id: adjustmentData.shop_id,
      shop_name: adjustmentData.shop_name,
      transaction_date: adjustmentData.transaction_date || new Date(),
      transaction_type: 'adjustment',
      reference_type: 'manual',
      reference_number: `ADJ-${Date.now()}`,
      debit_amount: adjustmentData.type === 'debit' ? adjustmentData.amount : 0,
      credit_amount: adjustmentData.type === 'credit' ? adjustmentData.amount : 0,
      description: adjustmentData.description || 'Manual adjustment',
      notes: adjustmentData.notes,
      created_by: adjustmentData.created_by,
      created_by_name: adjustmentData.created_by_name,
      is_manual: 1
    };
    
    return await this.createEntry(entryData);
  }
  
  /**
   * Get aging analysis for a shop
   * @param {number} shopId - Shop ID
   * @returns {Promise<Array>} Aging buckets with amounts
   */
  async getAgingAnalysis(shopId) {
    console.log(`📊 [SHOP LEDGER] Getting aging analysis for shop ${shopId}...`);
    
    const [aging] = await db.query(`
      SELECT 
        aging_bucket,
        COUNT(*) as invoice_count,
        SUM(balance_amount) as total_amount
      FROM v_invoice_aging
      WHERE shop_id = ?
      GROUP BY aging_bucket
      ORDER BY 
        CASE aging_bucket
          WHEN '0-Current' THEN 1
          WHEN '1-30 Days' THEN 2
          WHEN '31-60 Days' THEN 3
          WHEN '61-90 Days' THEN 4
          WHEN '90+ Days' THEN 5
        END
    `, [shopId]);
    
    return aging;
  }
  
  /**
   * Get all aging analysis (all shops)
   * @returns {Promise<Array>} All shops with aging details
   */
  async getAllAgingAnalysis() {
    console.log(`📊 [SHOP LEDGER] Getting aging analysis for all shops...`);
    
    const [aging] = await db.query(`
      SELECT 
        shop_id,
        shop_name,
        aging_bucket,
        COUNT(*) as invoice_count,
        SUM(balance_amount) as total_amount
      FROM v_invoice_aging
      GROUP BY shop_id, shop_name, aging_bucket
      ORDER BY shop_name, 
        CASE aging_bucket
          WHEN '0-Current' THEN 1
          WHEN '1-30 Days' THEN 2
          WHEN '31-60 Days' THEN 3
          WHEN '61-90 Days' THEN 4
          WHEN '90+ Days' THEN 5
        END
    `);
    
    return aging;
  }
  
  /**
   * Check if shop can create new order (credit limit check)
   * @param {number} shopId - Shop ID
   * @param {number} orderAmount - New order amount
   * @returns {Promise<Object>} Check result with details
   */
  async checkCreditLimit(shopId, orderAmount) {
    console.log(`🔍 [SHOP LEDGER] Checking credit limit for shop ${shopId}...`);
    
    const [shops] = await db.query(`
      SELECT * FROM v_shop_balance_summary WHERE shop_id = ?
    `, [shopId]);
    
    if (shops.length === 0) {
      throw new Error('Shop not found');
    }
    
    const shop = shops[0];
    const currentBalance = parseFloat(shop.current_balance) || 0;
    const creditLimit = parseFloat(shop.credit_limit) || 0;
    const availableCredit = creditLimit - currentBalance;
    const newBalance = currentBalance + parseFloat(orderAmount);
    const willExceedLimit = newBalance > creditLimit;
    
    return {
      shop_id: shopId,
      shop_name: shop.shop_name,
      credit_limit: creditLimit,
      current_balance: currentBalance,
      available_credit: availableCredit,
      order_amount: orderAmount,
      new_balance_if_ordered: newBalance,
      exceeds_limit: willExceedLimit,
      excess_amount: willExceedLimit ? newBalance - creditLimit : 0,
      can_proceed: !willExceedLimit,
      message: willExceedLimit 
        ? `Order will exceed credit limit by ${(newBalance - creditLimit).toFixed(2)} PKR` 
        : 'Order within credit limit'
    };
  }
  
  /**
   * Get shop balance summary
   * @param {number} shopId - Shop ID
   * @returns {Promise<Object>} Shop balance summary
   */
  async getShopBalance(shopId) {
    console.log(`💰 [SHOP LEDGER] Getting balance for shop ${shopId}...`);
    
    const [shops] = await db.query(`
      SELECT * FROM v_shop_balance_summary WHERE shop_id = ?
    `, [shopId]);
    
    if (shops.length === 0) {
      throw new Error('Shop not found');
    }
    
    return shops[0];
  }
  
  /**
   * Get all shops balance summary
   * @param {Object} filters - Filters (page, limit, sort_by, order)
   * @returns {Promise<Object>} All shops with balances
   */
  async getAllShopsBalance(filters = {}) {
    console.log(`💰 [SHOP LEDGER] Getting balance for all shops...`);
    
    const {
      page = 1,
      limit = 50,
      sort_by = 'current_balance',
      order = 'DESC'
    } = filters;
    
    const offset = (page - 1) * limit;
    const validSortColumns = ['shop_name', 'current_balance', 'available_credit', 'total_outstanding'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'current_balance';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // Get shops balance
    const [shops] = await db.query(`
      SELECT * FROM v_shop_balance_summary
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    
    // Get total count
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total FROM v_shop_balance_summary
    `);
    
    const total = countResult[0].total;
    
    return {
      shops,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = new ShopLedger();
