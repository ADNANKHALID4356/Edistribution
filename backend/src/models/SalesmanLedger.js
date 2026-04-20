/**
 * Salesman Ledger Model
 * Handles salary and payment records for salesmen
 */

const db = require('../config/database');
const useSQLite = process.env.USE_SQLITE === 'true' && process.env.NODE_ENV === 'development';

class SalesmanLedger {
  /**
   * Create a ledger entry (salary, advance, commission, etc.)
   */
  async createEntry(entryData) {
    const connection = useSQLite ? db : await db.getConnection();
    
    try {
      console.log('📝 Creating salesman ledger entry:', entryData);
      
      const query = `
        INSERT INTO salesman_ledger (
          salesman_id, salesman_name, transaction_date, transaction_type,
          amount, payment_method, reference_number, description, notes,
          created_by, created_by_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        entryData.salesman_id,
        entryData.salesman_name || null,
        entryData.transaction_date || new Date(),
        entryData.transaction_type || 'salary',
        entryData.amount,
        entryData.payment_method || 'cash',
        entryData.reference_number || null,
        entryData.description || '',
        entryData.notes || '',
        entryData.created_by || null,
        entryData.created_by_name || null
      ];
      
      // Use execute() for both SQLite and MySQL (dbWrapper handles conversion)
      const [result] = await connection.execute(query, params);
      
      console.log('✅ Salesman ledger entry created');
      
      return {
        success: true,
        id: result.insertId,
        message: 'Entry created successfully'
      };
      
    } catch (error) {
      console.error('❌ Error creating salesman ledger entry:', error);
      throw error;
    } finally {
      if (!useSQLite && connection) {
        connection.release();
      }
    }
  }
  
  /**
   * Get ledger entries for a salesman
   */
  async getSalesmanLedger(salesmanId, options = {}) {
    const connection = useSQLite ? db : await db.getConnection();
    
    try {
      const { page = 1, limit = 50, startDate, endDate } = options;
      const offset = (page - 1) * limit;
      
      // Build query parts
      let whereClauses = ['sl.salesman_id = ?'];
      const params = [parseInt(salesmanId)];
      
      if (startDate) {
        whereClauses.push('DATE(sl.transaction_date) >= ?');
        params.push(startDate);
      }
      
      if (endDate) {
        whereClauses.push('DATE(sl.transaction_date) <= ?');
        params.push(endDate);
      }
      
      const query = 'SELECT sl.*, u.full_name as created_by_full_name FROM salesman_ledger sl LEFT JOIN users u ON sl.created_by = u.id WHERE ' + whereClauses.join(' AND ') + ' ORDER BY sl.transaction_date DESC, sl.created_at DESC LIMIT ' + parseInt(limit) + ' OFFSET ' + parseInt(offset);
      
      console.log('📋 Query:', query);
      console.log('📋 Query params:', params);
      
      // Use query() instead of execute() for MySQL compatibility
      const [entries] = await connection.query(query, params);
      
      const countQuery = 'SELECT COUNT(*) as total FROM salesman_ledger WHERE salesman_id = ?';
      const [countRows] = await connection.query(countQuery, [parseInt(salesmanId)]);
      const countResult = countRows[0];
      
      return {
        success: true,
        data: entries,
        pagination: {
          page,
          limit,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit)
        }
      };
      
    } catch (error) {
      console.error('❌ Error fetching salesman ledger:', error);
      throw error;
    } finally {
      if (!useSQLite && connection) {
        connection.release();
      }
    }
  }
  
  /**
   * Get salary summary for a salesman
   */
  async getSalarySummary(salesmanId, year, month) {
    const connection = useSQLite ? db : await db.getConnection();
    
    try {
      let query = `
        SELECT 
          transaction_type,
          SUM(amount) as total_amount,
          COUNT(*) as count
        FROM salesman_ledger
        WHERE salesman_id = ?
      `;
      
      const params = [salesmanId];
      
      if (year) {
        query += useSQLite 
          ? ` AND strftime('%Y', transaction_date) = ?`
          : ` AND YEAR(transaction_date) = ?`;
        params.push(year.toString());
      }
      
      if (month) {
        query += useSQLite
          ? ` AND strftime('%m', transaction_date) = ?`
          : ` AND MONTH(transaction_date) = ?`;
        params.push(month.toString().padStart(2, '0'));
      }
      
      query += ' GROUP BY transaction_type';
      
      // Use execute() for both databases
      const [summary] = await connection.execute(query, params);
      
      // Transform summary into object with transaction type keys
      const summaryData = {
        total_salary: 0,
        total_advance: 0,
        total_commission: 0,
        total_deduction: 0,
        total_adjustment: 0
      };
      
      summary.forEach(row => {
        summaryData[`total_${row.transaction_type}`] = parseFloat(row.total_amount || 0);
      });
      
      return {
        success: true,
        data: summaryData
      };
      
    } catch (error) {
      console.error('❌ Error fetching salary summary:', error);
      throw error;
    } finally {
      if (!useSQLite && connection) {
        connection.release();
      }
    }
  }
  
  /**
   * Delete a ledger entry
   */
  async deleteEntry(entryId) {
    const connection = useSQLite ? db : await db.getConnection();
    
    try {
      const query = 'DELETE FROM salesman_ledger WHERE id = ?';
      
      // Use execute() for both databases
      await connection.execute(query, [entryId]);
      
      return {
        success: true,
        message: 'Entry deleted successfully'
      };
      
    } catch (error) {
      console.error('❌ Error deleting salesman ledger entry:', error);
      throw error;
    } finally {
      if (!useSQLite && connection) {
        connection.release();
      }
    }
  }
}

module.exports = new SalesmanLedger();
