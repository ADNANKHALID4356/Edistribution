/**
 * Order Controller
 * Sprint 5: Order Management System
 * Company: Ummahtechinnovations.com
 */

const Order = require('../models/Order');

/**
 * Get all orders with pagination and filters (Desktop)
 */
exports.getAllOrders = async (req, res) => {
  try {
    console.log('\n📦 ========== GET ALL ORDERS ==========');
    console.log('📍 Route: GET /api/desktop/orders');
    console.log('👤 User:', req.user ? `${req.user.full_name} (ID: ${req.user.id})` : 'Not authenticated');
    console.log('🔍 Query params:', req.query);
    
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      search: req.query.search || '',
      status: req.query.status || '',
      salesman_id: req.query.salesman_id || '',
      shop_id: req.query.shop_id || '',
      route_id: req.query.route_id || '',
      start_date: req.query.start_date || '',
      end_date: req.query.end_date || '',
      sortBy: req.query.sortBy || 'order_date',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    console.log('📋 Filters prepared:', filters);
    console.log('🔍 Calling Order.findAll() with filters...');

    const result = await Order.findAll(filters);

    console.log('✅ Orders retrieved successfully');
    console.log('📊 Results:', {
      ordersCount: result.orders.length,
      totalOrders: result.pagination.total,
      currentPage: result.pagination.page,
      totalPages: result.pagination.totalPages
    });

    if (result.orders.length > 0) {
      console.log('📦 Sample order:', {
        order_number: result.orders[0].order_number,
        status: result.orders[0].status,
        salesman: result.orders[0].salesman_name,
        shop: result.orders[0].shop_name
      });
    } else {
      console.log('⚠️ No orders found with current filters');
    }

    console.log('📦 ========== END GET ALL ORDERS ==========\n');

    res.json({
      success: true,
      data: result.orders,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('❌ ========== ERROR IN GET ALL ORDERS ==========');
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ ========== END ERROR ==========\n');
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

/**
 * Get order by ID with details
 */
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
};

/**
 * Get order history (Complete history for desktop)
 */
exports.getOrderHistory = async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50, // Higher limit for history
      search: req.query.search || '',
      status: req.query.status || '',
      salesman_id: req.query.salesman_id || '',
      shop_id: req.query.shop_id || '',
      route_id: req.query.route_id || '',
      start_date: req.query.start_date || '',
      end_date: req.query.end_date || '',
      sortBy: 'order_date',
      sortOrder: 'DESC'
    };

    const result = await Order.findAll(filters);

    res.json({
      success: true,
      data: result.orders,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order history',
      error: error.message
    });
  }
};

/**
 * Update order status
 */
exports.updateOrderStatus = async (req, res) => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 UPDATE ORDER STATUS REQUEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    console.log('🔍 Order ID:', id);
    console.log('🔍 New Status:', status);
    console.log('🔍 Notes:', notes);

    // Validate status - Accept both frontend and backend status values
    const validStatuses = ['draft', 'placed', 'processing', 'approved', 'finalized', 'rejected', 'delivered', 'cancelled'];
    console.log('🔍 Valid Statuses:', validStatuses);
    console.log('🔍 Status Valid?', validStatuses.includes(status));
    
    if (!validStatuses.includes(status)) {
      console.error('❌ Invalid status provided:', status);
      return res.status(400).json({
        success: false,
        message: `Invalid order status: ${status}. Valid statuses are: ${validStatuses.join(', ')}`
      });
    }
    
    console.log('✅ Status validation passed');

    // Check if order exists
    const existingOrder = await Order.findById(id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('🔄 Updating status in database...');
    const updated = await Order.updateStatus(id, status, notes || `Status changed to ${status}`);
    console.log('🔍 Update result:', updated);

    if (updated) {
      console.log('✅ Status updated successfully, fetching updated order...');
      const updatedOrder = await Order.findById(id);
      console.log('✅ Updated order retrieved, new status:', updatedOrder.status);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: updatedOrder
      });
    } else {
      console.error('❌ Update returned false');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      res.status(500).json({
        success: false,
        message: 'Failed to update order status - no rows affected'
      });
    }
  } catch (error) {
    console.error('❌❌❌ ERROR UPDATING ORDER STATUS ❌❌❌');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

/**
 * Create new order (Shared - used by mobile)
 */
exports.createOrder = async (req, res) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📥 CREATE ORDER REQUEST RECEIVED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    console.log('� Request body:', JSON.stringify(req.body, null, 2));
    console.log('👤 User:', req.user ? {id: req.user.id, username: req.user.username, role: req.user.role_id} : 'No user');
    
    const {
      salesman_id,
      shop_id,
      route_id,
      order_date,
      subtotal,
      discount_amount,
      discount_percentage,
      tax_amount,
      total_amount,
      status,
      notes,
      items
    } = req.body;

    console.log('🔍 Extracted fields:', { salesman_id, shop_id, route_id, order_date, subtotal, discount_amount, total_amount, itemsCount: items?.length });

    // Validation
    if (!salesman_id || !shop_id || !items || items.length === 0) {
      console.error('❌ Validation failed:', { salesman_id, shop_id, itemsCount: items?.length });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: salesman_id, shop_id, and items are required'
      });
    }

    // Validate amounts
    if (total_amount === undefined || total_amount === null) {
      console.error('❌ Total amount missing:', total_amount);
      return res.status(400).json({
        success: false,
        message: 'Total amount is required'
      });
    }

    // Validate items
    for (const item of items) {
      if (!item.product_id || !item.quantity || item.unit_price === undefined || item.total_price === undefined) {
        console.error('❌ Invalid item:', item);
        return res.status(400).json({
          success: false,
          message: 'Each item must have product_id, quantity, unit_price, and total_price'
        });
      }
    }

    console.log('✅ Validation passed');

    // Check for duplicate order (idempotent sync)
    // Generate expected order number to check if it already exists
    const date = new Date(order_date);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const expectedOrderNumberPrefix = `ORD-${dateStr}`;
    
    console.log('🔍 Checking for duplicate orders with prefix:', expectedOrderNumberPrefix);
    console.log('🔍 Duplicate check parameters:', {
      salesman_id,
      shop_id,
      order_date,
      total_amount,
      date_for_query: new Date(order_date).toISOString().slice(0, 10)
    });
    
    // Check if order already exists with same salesman, shop, date and amount
    console.log('🔍 Executing duplicate check query...');
    const [existingOrders] = await require('../config/database').query(
      `SELECT id, order_number, status, net_amount 
       FROM orders 
       WHERE salesman_id = ? 
         AND shop_id = ? 
         AND DATE(order_date) = DATE(?) 
         AND ABS(net_amount - ?) < 0.01
       ORDER BY created_at DESC 
       LIMIT 1`,
      [salesman_id, shop_id, order_date, total_amount]
    );
    
    console.log('✅ Duplicate check query executed');
    console.log('🔍 Found', existingOrders?.length || 0, 'matching orders');
    if (existingOrders && existingOrders.length > 0) {
      console.log('🔍 Existing orders details:', JSON.stringify(existingOrders, null, 2));
    }
    
    if (existingOrders && existingOrders.length > 0) {
      const existingOrder = existingOrders[0];
      console.log('⚠️  Duplicate order detected:', {
        existing_id: existingOrder.id,
        existing_order_number: existingOrder.order_number,
        existing_status: existingOrder.status
      });
      console.log('✅ Returning existing order (idempotent sync)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // Return the existing order as if it was just created
      return res.status(201).json({
        success: true,
        message: 'Order already exists (duplicate prevented)',
        data: {
          id: existingOrder.id,
          order_number: existingOrder.order_number,
          status: existingOrder.status,
          duplicate_prevented: true
        }
      });
    }
    
    console.log('✅ No duplicate found, proceeding with order creation');

    // Calculate values for backend compatibility
    // Mobile sends: subtotal (before discount), discount_amount, total_amount (after discount)
    // Backend expects: total_amount (before discount), discount, net_amount (after discount)
    const orderTotalAmount = subtotal || total_amount; // Total before discount
    const orderDiscount = discount_amount || 0; // Discount amount
    const orderNetAmount = total_amount; // Final amount after discount

    console.log('📊 Calculated values:', {
      orderTotalAmount,
      orderDiscount,
      orderNetAmount,
      itemsCount: items.length
    });

    // Validate and map items
    const mappedItems = items.map((item, index) => {
      // Validate each item field
      if (!item.product_id) {
        throw new Error(`Item ${index + 1}: product_id is required`);
      }
      if (!item.quantity || item.quantity <= 0) {
        throw new Error(`Item ${index + 1}: quantity must be greater than 0`);
      }
      if (item.unit_price === undefined || item.unit_price === null) {
        throw new Error(`Item ${index + 1}: unit_price is required`);
      }
      if (item.total_price === undefined || item.total_price === null) {
        throw new Error(`Item ${index + 1}: total_price is required`);
      }

      const discount = parseFloat(item.discount_amount || 0);
      const totalPrice = parseFloat(item.total_price);
      const netPrice = totalPrice - discount;

      return {
        product_id: parseInt(item.product_id),
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price),
        total_price: totalPrice,
        discount: discount,
        net_price: netPrice
      };
    });

    const orderPayload = {
      salesman_id: parseInt(salesman_id),
      shop_id: parseInt(shop_id),
      route_id: route_id ? parseInt(route_id) : null,
      order_date,
      total_amount: parseFloat(orderTotalAmount),
      discount: parseFloat(orderDiscount),
      net_amount: parseFloat(orderNetAmount),
      status: status || 'placed',
      notes: notes || '',
      items: mappedItems
    };

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 Calling Order.create() with payload:');
    console.log(JSON.stringify(orderPayload, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const newOrder = await Order.create(orderPayload);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Order.create() returned successfully');
    console.log('🔍 Returned order:', JSON.stringify(newOrder, null, 2));

    console.log('✅ Order created successfully:', newOrder.order_number);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: newOrder
    });
  } catch (error) {
    console.error('\n❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌');
    console.error('❌ ERROR CREATING ORDER');
    console.error('⏰ Error timestamp:', new Date().toISOString());
    console.error('🔍 Error name:', error.name);
    console.error('🔍 Error message:', error.message);
    console.error('🔍 Error code:', error.code);
    console.error('🔍 SQL errno:', error.errno);
    console.error('🔍 SQL state:', error.sqlState);
    console.error('🔍 SQL message:', error.sqlMessage);
    console.error('🔍 SQL query:', error.sql);
    console.error('🔍 Error stack:', error.stack);
    console.error('🔍 Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌\n');
    
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      errorCode: error.code,
      sqlMessage: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
    });
  }
};

/**
 * Get orders by salesman (Shared - used by mobile)
 */
exports.getOrdersBySalesman = async (req, res) => {
  try {
    const { salesmanId } = req.params;

    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status || '',
      start_date: req.query.start_date || '',
      end_date: req.query.end_date || ''
    };

    const result = await Order.findBySalesman(salesmanId, filters);

    res.json({
      success: true,
      data: result.orders,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching salesman orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salesman orders',
      error: error.message
    });
  }
};

/**
 * Update order (Desktop)
 */
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if order exists
    const existingOrder = await Order.findById(id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Prevent updating finalized or delivered orders
    if (['finalized', 'delivered'].includes(existingOrder.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update finalized or delivered orders'
      });
    }

    const updatedOrder = await Order.update(id, updateData);

    if (updatedOrder) {
      res.json({
        success: true,
        message: 'Order updated successfully',
        data: updatedOrder
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update order'
      });
    }
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order',
      error: error.message
    });
  }
};

/**
 * Delete order (Desktop - admin only)
 */
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if order exists
    const existingOrder = await Order.findById(id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Prevent deleting finalized or delivered orders
    if (['finalized', 'delivered'].includes(existingOrder.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete finalized or delivered orders'
      });
    }

    const deleted = await Order.delete(id);

    if (deleted) {
      res.json({
        success: true,
        message: 'Order deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete order'
      });
    }
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete order',
      error: error.message
    });
  }
};

/**
 * Get order statistics (Desktop)
 */
exports.getOrderStatistics = async (req, res) => {
  try {
    const filters = {
      salesman_id: req.query.salesman_id || '',
      start_date: req.query.start_date || '',
      end_date: req.query.end_date || ''
    };

    const stats = await Order.getStatistics(filters);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching order statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order statistics',
      error: error.message
    });
  }
};

// ========================================
// SPRINT 6: Order Processing & Approval
// ========================================

/**
 * Get pending orders for processing (Desktop)
 * Returns orders with status 'placed' or 'processing'
 */
exports.getPendingOrders = async (req, res) => {
  try {
    console.log('📋 [CONTROLLER] Getting pending orders for processing...');
    
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: 'placed,processing', // Only pending orders
      salesman_id: req.query.salesman_id || '',
      route_id: req.query.route_id || '',
      start_date: req.query.start_date || '',
      end_date: req.query.end_date || '',
      sortBy: 'order_date',
      sortOrder: 'ASC' // Oldest first for processing
    };

    const result = await Order.findAll(filters);
    
    console.log(`✅ [CONTROLLER] Found ${result.orders.length} pending orders`);

    res.json({
      success: true,
      data: result.orders,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Error fetching pending orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending orders',
      error: error.message
    });
  }
};

/**
 * Approve order (Desktop)
 * Changes status from 'placed' to 'approved'
 */
exports.approveOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes = '' } = req.body;

    console.log(`✅ [CONTROLLER] Approving order ${id}...`);

    // Check if order exists
    const existingOrder = await Order.findById(id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Validate current status
    if (!['placed', 'processing'].includes(existingOrder.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot approve order with status '${existingOrder.status}'. Only 'placed' or 'processing' orders can be approved.`
      });
    }

    // Update order status to approved
    const updatedOrder = await Order.updateStatus(id, 'approved', notes);

    console.log(`✅ [CONTROLLER] Order ${id} approved successfully`);

    res.json({
      success: true,
      message: 'Order approved successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Error approving order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve order',
      error: error.message
    });
  }
};

/**
 * Reject order (Desktop)
 * Changes status to 'rejected' with reason
 */
exports.rejectOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'No reason provided' } = req.body;

    console.log(`❌ [CONTROLLER] Rejecting order ${id}...`);
    console.log(`📝 [CONTROLLER] Rejection reason: ${reason}`);

    // Check if order exists
    const existingOrder = await Order.findById(id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Validate current status
    if (!['placed', 'processing', 'approved'].includes(existingOrder.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot reject order with status '${existingOrder.status}'. Only 'placed', 'processing', or 'approved' orders can be rejected.`
      });
    }

    // Update order status to rejected with reason
    const updatedOrder = await Order.updateStatus(id, 'rejected', reason);

    console.log(`✅ [CONTROLLER] Order ${id} rejected successfully`);

    res.json({
      success: true,
      message: 'Order rejected successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Error rejecting order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject order',
      error: error.message
    });
  }
};

/**
 * Finalize order (Desktop)
 * Changes status to 'finalized' and deducts stock
 */
exports.finalizeOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes = '' } = req.body;

    console.log(`🏁 [CONTROLLER] Finalizing order ${id}...`);

    // Check if order exists
    const existingOrder = await Order.findById(id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Validate current status
    if (existingOrder.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Cannot finalize order with status '${existingOrder.status}'. Only 'approved' orders can be finalized.`
      });
    }

    // Check stock availability for all items
    console.log(`📦 [CONTROLLER] Checking stock availability...`);
    const stockCheck = await Order.checkStockAvailability(id);
    
    if (!stockCheck.available) {
      console.log(`❌ [CONTROLLER] Insufficient stock for order ${id}`);
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock for one or more items',
        data: {
          insufficientItems: stockCheck.insufficientItems
        }
      });
    }

    // Finalize order and deduct stock
    const updatedOrder = await Order.finalizeOrder(id, notes);

    console.log(`✅ [CONTROLLER] Order ${id} finalized and stock deducted`);

    res.json({
      success: true,
      message: 'Order finalized successfully. Stock has been deducted.',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Error finalizing order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to finalize order',
      error: error.message
    });
  }
};

/**
 * Check stock availability for an order (Desktop)
 * Returns stock status for all items in the order
 */
exports.checkOrderStock = async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log(`📦 [CONTROLLER] Checking stock for order ${orderId}...`);

    // Check if order exists
    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Get stock availability details
    const stockCheck = await Order.checkStockAvailability(orderId);

    res.json({
      success: true,
      data: stockCheck
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Error checking stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check stock availability',
      error: error.message
    });
  }
};
