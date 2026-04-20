/**
 * Salesman Ledger Controller
 * Handles salary and payment operations for salesmen
 */

const SalesmanLedger = require('../models/SalesmanLedger');

/**
 * Create a new ledger entry (salary/payment)
 */
exports.createEntry = async (req, res) => {
  try {
    const { salesman_id, transaction_type, amount, payment_method, reference_number, description, notes, transaction_date } = req.body;
    
    // Validation
    if (!salesman_id || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Salesman ID and amount are required'
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }
    
    const result = await SalesmanLedger.createEntry({
      salesman_id,
      transaction_date: transaction_date || new Date(),
      transaction_type: transaction_type || 'salary',
      amount: parseFloat(amount),
      payment_method: payment_method || 'cash',
      reference_number,
      description,
      notes,
      created_by: req.user.id,
      created_by_name: req.user.full_name
    });
    
    res.status(201).json(result);
    
  } catch (error) {
    console.error('Error creating ledger entry:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating ledger entry',
      error: error.message
    });
  }
};

/**
 * Get ledger entries for a salesman
 */
exports.getSalesmanLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const { page, limit, startDate, endDate } = req.query;
    
    const result = await SalesmanLedger.getSalesmanLedger(id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      startDate,
      endDate
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('Error fetching salesman ledger:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ledger entries',
      error: error.message
    });
  }
};

/**
 * Get salary summary for a salesman
 */
exports.getSalarySummary = async (req, res) => {
  try {
    const { id } = req.params;
    const { year, month } = req.query;
    
    const result = await SalesmanLedger.getSalarySummary(
      id,
      year ? parseInt(year) : null,
      month ? parseInt(month) : null
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('Error fetching salary summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching salary summary',
      error: error.message
    });
  }
};

/**
 * Delete a ledger entry
 */
exports.deleteEntry = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await SalesmanLedger.deleteEntry(id);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error deleting ledger entry:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting ledger entry',
      error: error.message
    });
  }
};
