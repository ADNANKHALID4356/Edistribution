# 🏗️ COMPLETE SYSTEM ARCHITECTURE - SYNC FLOW ANALYSIS

**Date:** January 26, 2026  
**Purpose:** Deep comprehensive analysis of entire sync logic  
**Company:** Ummahtechinnovations

---

## 📊 SYSTEM OVERVIEW

### Three Components:
1. **Mobile App** (React Native + Expo) - Order creation and local storage
2. **Backend API** (Node.js + Express) - Central data hub
3. **Desktop App** (React + Electron) - Order management and display

---

## 🔄 DATA FLOW ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│                    MOBILE APP                           │
│  (React Native + Expo + SQLite)                        │
│  IP: 10.8.128.110:8081                                 │
└──────────────┬─────────────────────────────────────────┘
               │
               │ 1. User creates order
               │ 2. Saved to local SQLite
               │ 3. Auto-sync triggers
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│           SYNC SERVICE (mobile/src/services)             │
│  • syncService.syncOrders()                             │
│  • autoSyncService triggers sync                         │
│  • Retry queue for failed syncs                          │
└──────────────┬──────────────────────────────────────────┘
               │
               │ HTTP POST /api/mobile/sync/orders
               │ Authorization: Bearer <token>
               │ Body: {salesman_id, device_info, orders[]}
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│                BACKEND API SERVER                        │
│  (Node.js + Express + SQLite/MySQL)                     │
│  IP: 10.8.128.47:5000                                   │
│                                                          │
│  Route: POST /api/mobile/sync/orders                    │
│  Controller: syncController.syncOrders()                 │
│  Model: Order.create()                                   │
└──────────────┬──────────────────────────────────────────┘
               │
               │ Saves to database
               │ Returns: {success:true, data:{id, order_number}}
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│              BACKEND DATABASE                            │
│  Tables: orders, order_items                            │
│  Location: backend/data/distribution_system.db          │
└──────────────┬──────────────────────────────────────────┘
               │
               │ Desktop requests data
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│                DESKTOP APP                               │
│  (React + Electron)                                      │
│  URL: http://localhost:3000                             │
│                                                          │
│  Route: GET /api/desktop/orders                         │
│  Controller: orderController.getAllOrders()              │
│  Model: Order.findAll()                                  │
└──────────────────────────────────────────────────────────┘
```

---

## 📱 MOBILE APP - ORDER CREATION & SYNC

### 1. Order Creation Flow

**File:** `mobile/src/services/orderService.js`

```javascript
// Step 1: Create draft order
createDraftOrder(salesmanId, shopId, ...)
  ↓
// Step 2: Add items to order
addItemToOrder(orderId, productId, quantity, ...)
  ↓
// Step 3: Finalize order
finalizeOrder(orderId)
  ↓
// Result: Order saved to mobile SQLite with status='placed', synced=0
```

**Key Points:**
- Order stored locally in SQLite immediately
- `synced` column set to `0` (not synced)
- `backend_id` column set to `NULL`
- Order number generated: `ORD-YYYYMMDD-SXXX-00001`

---

### 2. Auto-Sync Service

**File:** `mobile/src/services/autoSyncService.js`

**Triggers:**
1. **Network change** - When WiFi connects
2. **App foreground** - When app comes to foreground
3. **Timer** - Every 30 minutes (background task)
4. **Manual** - User clicks "Sync Now"

**Logic:**
```javascript
async syncDataToBackend() {
  if (!isConnected) return; // Check network
  if (isSyncing) return;    // Prevent duplicate syncs
  
  // Upload unsynced orders
  const result = await syncService.syncOrders(salesmanId, deviceInfo);
  
  if (result.success) {
    console.log('✅ Synced:', result.synced);
  } else {
    console.error('❌ Failed:', result.error);
  }
}
```

---

### 3. Sync Service - Order Upload

**File:** `mobile/src/services/syncService.js`
**Function:** `syncOrders(salesmanId, deviceInfo)`

**Step-by-Step Process:**

#### Step 1: Get Unsynced Orders
```javascript
const unsyncedOrders = await dbHelper.getUnsyncedOrders();
// SQL: SELECT * FROM orders WHERE synced = 0
```

#### Step 2: Format Orders for Backend
```javascript
for (const order of unsyncedOrders) {
  const items = await dbHelper.getOrderDetails(order.id);
  
  formattedOrders.push({
    mobile_order_id: order.order_number,
    shop_id: order.shop_id,
    route_id: order.route_id,
    order_date: order.order_date,
    total_amount: order.subtotal,
    discount: order.discount_amount,
    net_amount: order.total_amount,
    items: items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price
    }))
  });
}
```

#### Step 3: Send to Backend
```javascript
const response = await api.post('/mobile/sync/orders', {
  salesman_id: salesmanId,
  device_info: {
    device_id: 'mobile-app',
    os: 'Android/iOS',
    app_version: '1.0.0'
  },
  orders: formattedOrders
});
```

#### Step 4: Update Local Database
```javascript
if (response.data.success) {
  const syncResults = response.data.data || response.data.orders || [];
  
  for (let i = 0; i < validOrders.length; i++) {
    const order = validOrders[i];
    const backendOrder = syncResults[i];
    
    if (backendOrder && backendOrder.id) {
      // CRITICAL: Save backend_id to local database
      await dbHelper.markOrderAsSynced(order.id, backendOrder.id);
      // SQL: UPDATE orders SET synced = 1, backend_id = ? WHERE id = ?
    }
  }
}
```

**Key Points:**
- Batch processing: Max 50 orders per request
- Retry queue: Failed orders added to retry queue
- Exponential backoff: 1s, 2s, 4s, 8s, 10s (max)
- **Critical:** Must save `backend_id` returned from API

---

## 🔧 BACKEND API - ORDER PROCESSING

### 1. API Route Registration

**File:** `backend/server.js`

```javascript
// Mobile sync routes
app.use('/api/mobile/sync', require('./src/routes/mobile/syncRoutes'));
```

### 2. Sync Routes

**File:** `backend/src/routes/mobile/syncRoutes.js`

```javascript
router.post('/orders', protect, syncLimiter, syncController.syncOrders);
```

**Key Points:**
- `protect` middleware: Validates JWT token
- `syncLimiter`: Rate limiting (100 requests/15 minutes)
- Authentication required for all sync endpoints

---

### 3. Sync Controller

**File:** `backend/src/controllers/syncController.js`
**Function:** `syncOrders(req, res)`

**Process:**

#### Step 1: Extract Data
```javascript
const { salesman_id, device_info, orders } = req.body;
```

#### Step 2: Validate Orders
```javascript
for (const order of orders) {
  // Validate required fields
  if (!order.shop_id) throw new Error('shop_id required');
  if (!order.items || order.items.length === 0) throw new Error('items required');
  
  // Validate items
  for (const item of order.items) {
    if (!item.product_id) throw new Error('product_id required');
    if (!item.quantity) throw new Error('quantity required');
  }
}
```

#### Step 3: Duplicate Check
```javascript
// Check if order already exists (idempotent sync)
const existingOrders = await db.query(`
  SELECT id, order_number FROM orders 
  WHERE salesman_id = ? 
    AND shop_id = ? 
    AND DATE(order_date) = DATE(?) 
    AND ABS(net_amount - ?) < 0.01
  ORDER BY created_at DESC 
  LIMIT 1
`, [salesman_id, shop_id, order_date, net_amount]);

if (existingOrders.length > 0) {
  // Return existing order (prevent duplicate)
  return res.json({
    success: true,
    message: 'Order already exists',
    data: existingOrder
  });
}
```

#### Step 4: Create Order
```javascript
const newOrder = await Order.create({
  salesman_id,
  shop_id,
  route_id,
  order_date,
  total_amount,
  discount,
  net_amount,
  status: 'placed',
  items
});
```

#### Step 5: Return Response
```javascript
res.status(201).json({
  success: true,
  message: 'Order created successfully',
  data: {
    id: newOrder.id,
    order_number: newOrder.order_number,
    status: newOrder.status
  }
});
```

---

### 4. Order Model

**File:** `backend/src/models/Order.js`
**Function:** `create(orderData)`

**Process:**

#### Step 1: Start Transaction
```javascript
const connection = await db.getConnection();
await connection.beginTransaction();
```

#### Step 2: Generate Order Number
```javascript
// Format: ORD-20260126-S004-00001
const order_number = await generateOrderNumber(order_date, salesman_id);

// Query: SELECT order_number FROM orders 
//        WHERE salesman_id = ? 
//          AND order_number LIKE 'ORD-20260126-S004-%'
//        ORDER BY order_number DESC LIMIT 1
```

#### Step 3: Insert Order
```javascript
const useSQLite = process.env.USE_SQLITE === 'true';

if (useSQLite) {
  // SQLite schema
  await connection.query(`
    INSERT INTO orders 
    (order_number, salesman_id, shop_id, warehouse_id, order_date, 
     total_amount, discount_amount, net_amount, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [order_number, salesman_id, shop_id, warehouse_id, order_date, 
      total_amount, discount, net_amount, status, notes]);
} else {
  // MySQL schema (includes route_id, synced_at)
  await connection.query(`
    INSERT INTO orders 
    (order_number, salesman_id, shop_id, warehouse_id, route_id, order_date, 
     total_amount, discount, net_amount, status, notes, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `, [order_number, salesman_id, shop_id, warehouse_id, route_id, order_date, 
      total_amount, discount, net_amount, status, notes]);
}
```

#### Step 4: Insert Order Items
```javascript
const ORDER_DETAILS_TABLE = useSQLite ? 'order_items' : 'order_details';

for (const item of items) {
  if (useSQLite) {
    // SQLite: has discount_percentage, no net_price
    const discount_percentage = item.discount && item.total_price > 0 
      ? (item.discount / item.total_price) * 100 
      : 0;
    
    await connection.query(`
      INSERT INTO ${ORDER_DETAILS_TABLE} 
      (order_id, product_id, quantity, unit_price, total_price, discount_percentage)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [orderId, item.product_id, item.quantity, item.unit_price, 
        item.total_price, discount_percentage]);
  } else {
    // MySQL: has discount and net_price
    await connection.query(`
      INSERT INTO ${ORDER_DETAILS_TABLE} 
      (order_id, product_id, quantity, unit_price, total_price, discount, net_price)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [orderId, item.product_id, item.quantity, item.unit_price, 
        item.total_price, item.discount, item.net_price]);
  }
}
```

#### Step 5: Commit Transaction
```javascript
await connection.commit();
connection.release();

return {
  id: orderId,
  order_number: order_number,
  status: status
};
```

---

## 🖥️ DESKTOP APP - ORDER DISPLAY

### 1. API Client

**File:** `desktop/src/services/api.js`

```javascript
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

### 2. Order Management Component

**File:** `desktop/src/pages/OrderManagement.jsx` (or similar)

**Fetch Orders:**
```javascript
async function fetchOrders() {
  const response = await api.get('/desktop/orders', {
    params: {
      page: 1,
      limit: 10,
      sortBy: 'order_date',
      sortOrder: 'DESC'
    }
  });
  
  if (response.data.success) {
    setOrders(response.data.data);
    setPagination(response.data.pagination);
  }
}
```

---

### 3. Backend Route - Get Orders

**File:** `backend/src/routes/desktop/orderRoutes.js`

```javascript
router.get('/', orderController.getAllOrders);
```

---

### 4. Order Controller - Get All Orders

**File:** `backend/src/controllers/orderController.js`
**Function:** `getAllOrders(req, res)`

**Process:**

#### Step 1: Extract Filters
```javascript
const filters = {
  page: parseInt(req.query.page) || 1,
  limit: parseInt(req.query.limit) || 10,
  search: req.query.search || '',
  status: req.query.status || '',
  salesman_id: req.query.salesman_id || '',
  shop_id: req.query.shop_id || '',
  start_date: req.query.start_date || '',
  end_date: req.query.end_date || '',
  sortBy: req.query.sortBy || 'order_date',
  sortOrder: req.query.sortOrder || 'DESC'
};
```

#### Step 2: Call Model
```javascript
const result = await Order.findAll(filters);
```

#### Step 3: Return Response
```javascript
res.json({
  success: true,
  data: result.orders,
  pagination: result.pagination
});
```

---

### 5. Order Model - Find All

**File:** `backend/src/models/Order.js`
**Function:** `findAll(filters)`

**SQL Query:**
```sql
SELECT 
  o.id,
  o.order_number,
  o.salesman_id,
  o.shop_id,
  o.order_date,
  o.total_amount,
  o.discount_amount,
  o.net_amount,
  o.status,
  o.notes,
  o.created_at,
  s.full_name as salesman_name,
  s.salesman_code,
  sh.shop_name,
  sh.shop_code,
  sh.phone as shop_phone,
  sh.address as shop_address,
  COUNT(oi.id) as items_count,
  SUM(oi.quantity) as total_quantity
FROM orders o
LEFT JOIN salesmen s ON o.salesman_id = s.user_id
LEFT JOIN shops sh ON o.shop_id = sh.id
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE 1=1
  AND (o.order_number LIKE ? OR sh.shop_name LIKE ?)
  AND (? = '' OR o.status = ?)
  AND (? = '' OR o.salesman_id = ?)
GROUP BY o.id
ORDER BY o.order_date DESC
LIMIT ? OFFSET ?
```

**Key Points:**
- Joins with salesmen, shops, order_items tables
- Returns complete order information
- Includes salesman name, shop name, item counts
- Pagination support

---

## 🔍 CRITICAL SYNC POINTS

### 1. Mobile → Backend Sync

**Success Criteria:**
```
✅ Order exists in mobile SQLite (synced=0)
✅ Network connectivity (WiFi on 10.8.128.X subnet)
✅ Valid JWT token in request
✅ Backend accessible at 10.8.128.47:5000
✅ POST /api/mobile/sync/orders receives order data
✅ Backend creates order successfully
✅ Backend returns {id, order_number}
✅ Mobile updates: synced=1, backend_id=<returned_id>
```

**Failure Points:**
```
❌ Network disconnected
❌ Wrong IP/Port configured
❌ Backend not running
❌ JWT token expired/invalid
❌ SQL error (missing columns, constraint violations)
❌ Duplicate order detected (same salesman, shop, date, amount)
❌ Missing required fields (product_id, quantity, etc.)
```

---

### 2. Backend → Desktop Display

**Success Criteria:**
```
✅ Orders exist in backend database
✅ Desktop app running on localhost:3000
✅ Valid JWT token in localStorage
✅ GET /api/desktop/orders request successful
✅ Backend returns orders with JOIN data
✅ Desktop renders order list
```

**Failure Points:**
```
❌ No orders in database
❌ Desktop not logged in (no token)
❌ Token expired
❌ Backend not running
❌ SQL join error (missing salesmen/shops data)
❌ Frontend rendering error
```

---

## 🔧 DATABASE SCHEMA DIFFERENCES

### SQLite (Development)
```sql
-- orders table
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  salesman_id INTEGER NOT NULL,
  shop_id INTEGER NOT NULL,
  warehouse_id INTEGER,
  -- NO route_id column
  order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,  -- Note: discount_amount
  net_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'placed',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  -- NO synced_at column
);

-- order_items table (not order_details)
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  discount_percentage REAL DEFAULT 0,  -- Note: discount_percentage
  -- NO discount column
  -- NO net_price column
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### MySQL (Production)
```sql
-- orders table
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  salesman_id INT NOT NULL,
  shop_id INT NOT NULL,
  warehouse_id INT,
  route_id INT,  -- Has route_id
  order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_amount DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,  -- Note: discount
  net_amount DECIMAL(12,2) DEFAULT 0,
  status ENUM('placed','approved','rejected','delivered'),
  notes TEXT,
  synced_at DATETIME,  -- Has synced_at
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- order_details table (not order_items)
CREATE TABLE order_details (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) DEFAULT 0,  -- Has discount
  net_price DECIMAL(12,2) NOT NULL,  -- Has net_price
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Model handles this automatically:**
```javascript
const useSQLite = process.env.USE_SQLITE === 'true';
const ORDER_DETAILS_TABLE = useSQLite ? 'order_items' : 'order_details';
```

---

## 📋 SYNC TROUBLESHOOTING CHECKLIST

### Mobile App Not Syncing?

**1. Check Network:**
```
LOG  📡 Network changed: Connected → Connected
LOG     Type: wifi, Details: {"ipAddress": "10.8.128.110"...}
```
✅ Must show "Connected" and IP on 10.8.128.X subnet

**2. Check Server Config:**
```javascript
// mobile/src/utils/serverConfig.js
DEFAULT_CONFIG = {
  protocol: 'http',
  host: '10.8.128.47',  // Must match computer IP
  port: '5000'
}
```

**3. Check Orders Exist:**
```sql
-- Check mobile SQLite
SELECT * FROM orders WHERE synced = 0;
```

**4. Check Sync Attempt:**
```
LOG  🔄 Starting orders upload (sync to backend)...
LOG  📦 Found X unsynced orders
LOG  📤 Uploading batch 1 (X orders)...
```

**5. Check Response:**
```
LOG  ✅ Backend response: success
LOG  ✅ Marking order X as synced with backend_id: 13
LOG  ✅ Orders sync completed: 1 synced, 0 failed
```

**❌ If seeing errors:**
```
LOG  ⚠️ Order X sync error recorded
LOG  ❌ Sync failed: no such column: reserved_stock
```
→ Backend schema issue

---

### Backend Not Receiving?

**1. Check Backend Running:**
```bash
netstat -ano | findstr :5000
# Should show: LISTENING
```

**2. Check Backend Logs:**
```
🌐 POST /api/mobile/sync/orders
📍 From: 10.8.128.110
🔐 AUTH MIDDLEWARE - Checking authentication...
✅ Token found: eyJhbGciOiJI...
```

**3. Check Database:**
```sql
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;
```

**4. Check Products Table:**
```sql
PRAGMA table_info(products);
-- Must include: reserved_stock REAL DEFAULT 0
```

---

### Desktop Not Showing Orders?

**1. Check Login:**
```javascript
// Desktop localStorage
const token = localStorage.getItem('token');
const user = localStorage.getItem('user');
```

**2. Check API Call:**
```javascript
// Browser console
await api.get('/desktop/orders');
// Should return: {success: true, data: [...]}
```

**3. Check Backend Logs:**
```
🌐 GET /api/desktop/orders
📍 From: 127.0.0.1
✅ Token verified for user ID: 1
✅ Orders retrieved successfully
📊 Results: { ordersCount: 5, totalOrders: 5 }
```

**4. Check Database:**
```sql
SELECT 
  o.order_number,
  s.full_name as salesman,
  sh.shop_name,
  o.net_amount
FROM orders o
LEFT JOIN salesmen s ON o.salesman_id = s.user_id
LEFT JOIN shops sh ON o.shop_id = sh.id;
```

---

## 🎯 SYNC SUCCESS VERIFICATION

### Complete Flow Test:

**1. Mobile - Create Order:**
```
✅ Order created locally
✅ Order number: ORD-20260126-S004-00001
✅ Status: placed
✅ Synced: 0
✅ Backend ID: null
```

**2. Mobile - Auto Sync:**
```
✅ Network: Connected
✅ Found 1 unsynced order
✅ POST /api/mobile/sync/orders
✅ Response: {success: true, data: {id: 13, order_number: ...}}
✅ Updated: synced=1, backend_id=13
```

**3. Backend - Received:**
```
✅ Order created in database
✅ ID: 13
✅ Order number: ORD-20260126-S004-00001
✅ Items: 10 records in order_items table
```

**4. Desktop - Display:**
```
✅ GET /api/desktop/orders
✅ Response: 1 order
✅ Displays: ORD-20260126-S004-00001
✅ Salesman: ADNAN KHALID
✅ Shop: Shop Name
✅ Amount: 840.00
```

---

## 🚨 COMMON ISSUES & FIXES

### Issue 1: "no such column: reserved_stock"
**Cause:** Backend database missing column  
**Fix:** Restart backend (schema applies on startup)

### Issue 2: Orders sync but desktop shows 0
**Cause:** Missing user/shop/salesman data  
**Fix:** Ensure users, shops, salesmen exist before orders

### Issue 3: "backend_id: null" after sync
**Cause:** Retry logic bug not extracting ID from response  
**Fix:** Already fixed in syncService.js lines 1128-1141

### Issue 4: Duplicate orders
**Cause:** Retry without duplicate check  
**Fix:** Backend has duplicate prevention logic

### Issue 5: Wrong IP cached
**Cause:** AsyncStorage caching old config  
**Fix:** Restart with `npx expo start -c` flag

---

## ✅ DEPLOYMENT BEST PRACTICES

1. **Always verify schema** before production
2. **Test with fresh database** to catch missing data issues
3. **Monitor sync logs** for patterns of failures
4. **Implement retry with exponential backoff**
5. **Use duplicate prevention** (idempotent syncs)
6. **Validate all inputs** on backend
7. **Use transactions** for multi-table operations
8. **Handle network errors gracefully**
9. **Log all sync attempts** for debugging
10. **Clear caches** when config changes

---

**End of Analysis**
