/**
 * Daily Collection Controller
 * Handles daily received amount API endpoints
 */

const DailyCollection = require('../models/DailyCollection');

// Create collection entry
const createCollection = async (req, res) => {
  try {
    const data = {
      ...req.body,
      created_by: req.user?.id,
      created_by_name: req.user?.full_name
    };

    if (!data.amount || data.amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    const result = await DailyCollection.create(data);
    res.status(201).json({ success: true, message: 'Collection recorded', data: result });
  } catch (error) {
    console.error('❌ createCollection error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all collections
const getAllCollections = async (req, res) => {
  try {
    const result = await DailyCollection.getAll(req.query);
    res.json({ success: true, data: result.collections, pagination: result.pagination });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get collection by ID
const getCollectionById = async (req, res) => {
  try {
    const result = await DailyCollection.getById(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get daily summary
const getDailySummary = async (req, res) => {
  try {
    const result = await DailyCollection.getDailySummary(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get today's summary
const getTodaySummary = async (req, res) => {
  try {
    const result = await DailyCollection.getTodaySummary();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update collection entry
const updateCollection = async (req, res) => {
  try {
    const result = await DailyCollection.update(req.params.id, req.body);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }
    res.json({ success: true, message: 'Collection updated', data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete collection entry
const deleteCollection = async (req, res) => {
  try {
    await DailyCollection.delete(req.params.id);
    res.json({ success: true, message: 'Collection deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createCollection,
  getAllCollections,
  getCollectionById,
  getDailySummary,
  getTodaySummary,
  updateCollection,
  deleteCollection
};
