const db = require('../config/database');

class LoadSheet {
  static async generateLoadSheetNumber() {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');

    const [rows] = await db.query(
      `SELECT load_sheet_number FROM load_sheets WHERE load_sheet_number LIKE ? ORDER BY id DESC LIMIT 1`,
      [`LS-${dateStr}-%`]
    );

    let seq = 1;
    if (rows.length > 0) {
      const last = rows[0].load_sheet_number.split('-')[2];
      seq = parseInt(last) + 1;
    }

    return `LS-${dateStr}-${seq.toString().padStart(4, '0')}`;
  }

  static async create(loadSheetData, deliveryIds = [], userId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const loadSheetNumber = await this.generateLoadSheetNumber();

      const [result] = await connection.query(`
        INSERT INTO load_sheets (
          load_sheet_number, loading_date, warehouse_id, vehicle_number, driver_name, driver_phone,
          route_id, route_name, salesman_id, salesman_name, 
          total_deliveries, total_products, total_quantity, total_weight, total_value, 
          notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        loadSheetNumber,
        loadSheetData.loading_date || new Date(),
        loadSheetData.warehouse_id,
        loadSheetData.vehicle_number || null,
        loadSheetData.driver_name || null,
        loadSheetData.driver_phone || null,
        loadSheetData.route_id || null,
        loadSheetData.route_name || null,
        loadSheetData.salesman_id || null,
        loadSheetData.salesman_name || null,
        loadSheetData.total_deliveries || 0,
        loadSheetData.total_products || 0,
        loadSheetData.total_quantity || 0,
        loadSheetData.total_weight || 0,
        loadSheetData.total_value || 0,
        loadSheetData.notes || null,
        userId || null
      ]);

      const loadSheetId = result.insertId;

      if (deliveryIds && deliveryIds.length > 0) {
        const insertValues = deliveryIds.map((deliveryId, idx) => `(${loadSheetId}, ${deliveryId}, ${idx + 1})`).join(',');
        await connection.query(`
          INSERT INTO load_sheet_deliveries (load_sheet_id, delivery_id, delivery_sequence) VALUES ${insertValues}
        `);
      }

      await connection.commit();

      return {
        id: loadSheetId,
        load_sheet_number: loadSheetNumber
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getByWarehouse(warehouseId) {
    try {
      const [rows] = await db.query(`
        SELECT ls.*, w.name as warehouse_name
        FROM load_sheets ls
        LEFT JOIN warehouses w ON ls.warehouse_id = w.id
        WHERE ls.warehouse_id = ?
        ORDER BY ls.created_at DESC
      `, [warehouseId]);

      return rows;
    } catch (error) {
      console.error('❌ Error fetching load sheets by warehouse:', error);
      throw error;
    }
  }

  static async getById(id) {
    try {
      // Get load sheet header
      const [sheets] = await db.query(`
        SELECT ls.*, w.name as warehouse_name,
               u.username as created_by_name
        FROM load_sheets ls
        LEFT JOIN warehouses w ON ls.warehouse_id = w.id
        LEFT JOIN users u ON ls.created_by = u.id
        WHERE ls.id = ?
      `, [id]);

      if (sheets.length === 0) {
        return null;
      }

      const loadSheet = sheets[0];

      // Get deliveries linked to this load sheet
      const [deliveries] = await db.query(`
        SELECT d.*, lsd.delivery_sequence,
               s.shop_name, s.address as shop_address, s.phone as shop_phone
        FROM load_sheet_deliveries lsd
        INNER JOIN deliveries d ON lsd.delivery_id = d.id
        LEFT JOIN shops s ON d.shop_id = s.id
        WHERE lsd.load_sheet_id = ?
        ORDER BY lsd.delivery_sequence
      `, [id]);

      // Get consolidated products (from delivery items)
      const [products] = await db.query(`
        SELECT di.product_id, di.product_name, di.product_code,
               SUM(di.quantity_delivered) as total_quantity,
               'pcs' as unit,
               SUM(di.total_price) as total_amount,
               AVG(di.unit_price) as price,
               COUNT(DISTINCT d.id) as delivery_count
        FROM load_sheet_deliveries lsd
        INNER JOIN deliveries d ON lsd.delivery_id = d.id
        INNER JOIN delivery_items di ON d.id = di.delivery_id
        WHERE lsd.load_sheet_id = ?
        GROUP BY di.product_id, di.product_name, di.product_code
        ORDER BY di.product_name
      `, [id]);

      return {
        ...loadSheet,
        deliveries: deliveries,
        consolidated_products: products
      };
    } catch (error) {
      console.error('❌ Error fetching load sheet by ID:', error);
      throw error;
    }
  }

  static async update(id, loadSheetData, deliveryIds = [], userId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Update load sheet header
      await connection.query(`
        UPDATE load_sheets SET
          loading_date = ?,
          vehicle_number = ?,
          driver_name = ?,
          driver_phone = ?,
          route_id = ?,
          salesman_id = ?,
          total_deliveries = ?,
          total_products = ?,
          total_quantity = ?,
          total_value = ?,
          notes = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        loadSheetData.loading_date,
        loadSheetData.vehicle_number || null,
        loadSheetData.driver_name || null,
        loadSheetData.driver_phone || null,
        loadSheetData.route_id || null,
        loadSheetData.salesman_id || null,
        deliveryIds.length,
        loadSheetData.total_products || 0,
        loadSheetData.total_quantity || 0,
        loadSheetData.total_value || 0,
        loadSheetData.notes || null,
        id
      ]);

      // Delete existing delivery links
      await connection.query(`DELETE FROM load_sheet_deliveries WHERE load_sheet_id = ?`, [id]);

      // Insert new delivery links
      if (deliveryIds && deliveryIds.length > 0) {
        const insertValues = deliveryIds.map((deliveryId, idx) => `(${id}, ${deliveryId}, ${idx + 1})`).join(',');
        await connection.query(`
          INSERT INTO load_sheet_deliveries (load_sheet_id, delivery_id, delivery_sequence) VALUES ${insertValues}
        `);
      }

      await connection.commit();

      return { id };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async delete(id, userId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Delete delivery links first (foreign key)
      await connection.query(`DELETE FROM load_sheet_deliveries WHERE load_sheet_id = ?`, [id]);

      // Delete load sheet
      await connection.query(`DELETE FROM load_sheets WHERE id = ?`, [id]);

      await connection.commit();

      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async updateStatus(id, status, userId) {
    try {
      await db.query(`
        UPDATE load_sheets SET
          status = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [status, id]);

      return { id, status };
    } catch (error) {
      console.error('❌ Error updating load sheet status:', error);
      throw error;
    }
  }
}

module.exports = LoadSheet;
