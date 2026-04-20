const LoadSheet = require('../models/LoadSheet');

exports.createLoadSheet = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { loadSheet, deliveryIds } = req.body;

    if (!loadSheet || !loadSheet.warehouse_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Warehouse is required' 
      });
    }

    const result = await LoadSheet.create(loadSheet, deliveryIds, userId);

    res.status(201).json({
      success: true,
      message: 'Load sheet created successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Error creating load sheet:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create load sheet', 
      error: error.message 
    });
  }
};

exports.getLoadSheetsByWarehouse = async (req, res) => {
  try {
    const warehouseId = req.params.warehouseId || req.query.warehouse_id;
    if (!warehouseId) {
      return res.status(400).json({ success: false, message: 'warehouse_id is required' });
    }

    const rows = await LoadSheet.getByWarehouse(warehouseId);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error fetching load sheets:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch load sheets', error: error.message });
  }
};

exports.getLoadSheetById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Load sheet ID is required' });
    }

    const loadSheet = await LoadSheet.getById(id);
    if (!loadSheet) {
      return res.status(404).json({ success: false, message: 'Load sheet not found' });
    }

    res.json({ success: true, data: loadSheet });
  } catch (error) {
    console.error('❌ Error fetching load sheet:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch load sheet', error: error.message });
  }
};

exports.updateLoadSheet = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;
    const { loadSheet, deliveryIds } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Load sheet ID is required' });
    }

    // Check if load sheet exists and is editable
    const existing = await LoadSheet.getById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Load sheet not found' });
    }

    if (existing.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft load sheets can be edited' });
    }

    const result = await LoadSheet.update(id, loadSheet, deliveryIds || [], userId);

    res.json({
      success: true,
      message: 'Load sheet updated successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Error updating load sheet:', error);
    res.status(500).json({ success: false, message: 'Failed to update load sheet', error: error.message });
  }
};

exports.deleteLoadSheet = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Load sheet ID is required' });
    }

    // Check if load sheet exists and is deletable
    const existing = await LoadSheet.getById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Load sheet not found' });
    }

    if (existing.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft load sheets can be deleted' });
    }

    await LoadSheet.delete(id, userId);

    res.json({
      success: true,
      message: 'Load sheet deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting load sheet:', error);
    res.status(500).json({ success: false, message: 'Failed to delete load sheet', error: error.message });
  }
};

exports.updateLoadSheetStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id || null;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Load sheet ID is required' });
    }

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const validStatuses = ['draft', 'confirmed', 'loading', 'loaded', 'in_transit', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const result = await LoadSheet.updateStatus(id, status, userId);

    res.json({
      success: true,
      message: `Load sheet status updated to ${status}`,
      data: result
    });
  } catch (error) {
    console.error('❌ Error updating load sheet status:', error);
    res.status(500).json({ success: false, message: 'Failed to update load sheet status', error: error.message });
  }
};
