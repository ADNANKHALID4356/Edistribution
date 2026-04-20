# 🧪 Comprehensive Desktop/Backend CRUD Testing Checklist

## System Status After Cleanup
- ✅ VPS_UPLOAD_PACKAGE duplicate backend removed
- ✅ 16 BAT files moved to _CLEANUP_TEMPORARY
- ✅ 50+ historical documentation files archived
- ✅ Backend API health check: HTTP 200 OK
- ✅ Database: Fresh SQLite with correct schema (including reserved_stock)

## Testing Protocol
**Testing Order:** Test each module systematically, document all results  
**Pass Criteria:** All CRUD operations must work "with grace and professionalism"  
**Failure Protocol:** Document error, analyze logs, fix before proceeding

---

## 🔐 Module 1: Authentication & Authorization
### Login System
- [ ] **Test 1.1:** Login with admin credentials (admin / admin123)
- [ ] **Test 1.2:** Verify JWT token received and stored
- [ ] **Test 1.3:** Access protected route (should succeed)
- [ ] **Test 1.4:** Logout and verify token cleared
- [ ] **Test 1.5:** Access protected route after logout (should redirect)
- [ ] **Test 1.6:** Invalid credentials (should show error message)

**Status:** ⏸️ NOT STARTED  
**Notes:**

---

## 📦 Module 2: Products Management
### CRUD Operations
- [ ] **Test 2.1:** Navigate to Products page
- [ ] **Test 2.2:** View products list (initially empty)
- [ ] **Test 2.3:** CREATE - Add new product
  - Name: "Test Product A"
  - Category: "Electronics"
  - Price: 500
  - Stock: 100
  - Warehouse: Select from dropdown
- [ ] **Test 2.4:** READ - Verify product appears in list
- [ ] **Test 2.5:** READ - View product details
- [ ] **Test 2.6:** UPDATE - Edit product (change price to 550)
- [ ] **Test 2.7:** DELETE - Remove product (verify confirmation dialog)
- [ ] **Test 2.8:** Search functionality (search for product by name)
- [ ] **Test 2.9:** Filter by category
- [ ] **Test 2.10:** Pagination (if applicable)
- [ ] **Test 2.11:** reserved_stock column (verify no SQL errors)

**Status:** ⏸️ NOT STARTED  
**Notes:**

---

## 🏪 Module 3: Shops Management
### CRUD Operations
- [ ] **Test 3.1:** Navigate to Shops page
- [ ] **Test 3.2:** View shops list (initially empty)
- [ ] **Test 3.3:** CREATE - Add new shop
  - Name: "Test Shop Alpha"
  - Owner: "John Doe"
  - Contact: "0300-1234567"
  - Address: "123 Test Street"
  - Route: Select from dropdown
- [ ] **Test 3.4:** READ - Verify shop appears in list
- [ ] **Test 3.5:** READ - View shop details
- [ ] **Test 3.6:** UPDATE - Edit shop info (change contact number)
- [ ] **Test 3.7:** DELETE - Remove shop
- [ ] **Test 3.8:** Search shops by name/owner
- [ ] **Test 3.9:** Filter by route
- [ ] **Test 3.10:** View shop ledger (balance, transactions)

**Status:** ⏸️ NOT STARTED  
**Notes:**

---

## 🛣️ Module 4: Routes Management
### CRUD Operations
- [ ] **Test 4.1:** Navigate to Routes page
- [ ] **Test 4.2:** View routes list (initially empty)
- [ ] **Test 4.3:** CREATE - Add new route
  - Name: "Route North"
  - Description: "Northern district coverage"
- [ ] **Test 4.4:** READ - Verify route appears in list
- [ ] **Test 4.5:** READ - View route details
- [ ] **Test 4.6:** UPDATE - Edit route (change description)
- [ ] **Test 4.7:** DELETE - Remove route
- [ ] **Test 4.8:** Assign shops to route
- [ ] **Test 4.9:** Assign salesman to route
- [ ] **Test 4.10:** View route statistics

**Status:** ⏸️ NOT STARTED  
**Notes:**

---

## 👨‍💼 Module 5: Salesmen Management
### CRUD Operations
- [ ] **Test 5.1:** Navigate to Salesmen page
- [ ] **Test 5.2:** View salesmen list (initially empty)
- [ ] **Test 5.3:** CREATE - Add new salesman
  - Username: "adnan"
  - Password: "123"
  - Name: "Adnan Salesman"
  - Contact: "0300-9876543"
  - Role: "salesman"
- [ ] **Test 5.4:** READ - Verify salesman appears in list
- [ ] **Test 5.5:** READ - View salesman details
- [ ] **Test 5.6:** UPDATE - Edit salesman info (change contact)
- [ ] **Test 5.7:** DELETE - Remove salesman
- [ ] **Test 5.8:** Assign route to salesman
- [ ] **Test 5.9:** View salesman performance/stats
- [ ] **Test 5.10:** Test salesman login credentials

**Status:** ⏸️ NOT STARTED  
**Notes:**

---

## 📋 Module 6: Orders Management
### Read and View Operations
- [ ] **Test 6.1:** Navigate to Orders page
- [ ] **Test 6.2:** View orders list (initially empty until mobile syncs)
- [ ] **Test 6.3:** Filter orders by status (pending/completed/cancelled)
- [ ] **Test 6.4:** Filter orders by date range
- [ ] **Test 6.5:** Filter orders by shop
- [ ] **Test 6.6:** Filter orders by salesman
- [ ] **Test 6.7:** Search orders by ID/shop name
- [ ] **Test 6.8:** View order details (products, quantities, amounts)
- [ ] **Test 6.9:** Update order status
- [ ] **Test 6.10:** View order timeline/history

**Status:** ⏸️ NOT STARTED  
**Notes:** Orders are created by mobile app, desktop only displays/manages

---

## 🧾 Module 7: Invoices Management
### Invoice Operations
- [ ] **Test 7.1:** Navigate to Invoices page
- [ ] **Test 7.2:** View invoices list
- [ ] **Test 7.3:** CREATE - Generate invoice from order
- [ ] **Test 7.4:** READ - View invoice details
- [ ] **Test 7.5:** Print invoice (verify PDF generation)
- [ ] **Test 7.6:** Email invoice (if applicable)
- [ ] **Test 7.7:** Filter invoices by date
- [ ] **Test 7.8:** Filter invoices by shop
- [ ] **Test 7.9:** Search invoices
- [ ] **Test 7.10:** Invoice payment status update

**Status:** ⏸️ NOT STARTED  
**Notes:**

---

## 💰 Module 8: Ledger System
### Ledger Operations
- [ ] **Test 8.1:** Navigate to Ledger page
- [ ] **Test 8.2:** View shop ledger balances
- [ ] **Test 8.3:** Filter ledger by shop
- [ ] **Test 8.4:** View transaction history
- [ ] **Test 8.5:** Record payment (credit)
- [ ] **Test 8.6:** Record purchase (debit)
- [ ] **Test 8.7:** Verify balance calculations
- [ ] **Test 8.8:** Search transactions
- [ ] **Test 8.9:** Export ledger report
- [ ] **Test 8.10:** Date range filtering

**Status:** ⏸️ NOT STARTED  
**Notes:**

---

## 🏭 Module 9: Suppliers Management
### CRUD Operations
- [ ] **Test 9.1:** Navigate to Suppliers page
- [ ] **Test 9.2:** View suppliers list
- [ ] **Test 9.3:** CREATE - Add new supplier
- [ ] **Test 9.4:** READ - Verify supplier in list
- [ ] **Test 9.5:** READ - View supplier details
- [ ] **Test 9.6:** UPDATE - Edit supplier info
- [ ] **Test 9.7:** DELETE - Remove supplier
- [ ] **Test 9.8:** Search suppliers
- [ ] **Test 9.9:** View supplier transactions
- [ ] **Test 9.10:** Supplier ledger balance

**Status:** ⏸️ NOT STARTED  
**Notes:**

---

## 🏢 Module 10: Warehouses Management
### CRUD Operations
- [ ] **Test 10.1:** Navigate to Warehouses page
- [ ] **Test 10.2:** View warehouses list
- [ ] **Test 10.3:** CREATE - Add new warehouse
- [ ] **Test 10.4:** READ - Verify warehouse in list
- [ ] **Test 10.5:** READ - View warehouse details
- [ ] **Test 10.6:** UPDATE - Edit warehouse info
- [ ] **Test 10.7:** DELETE - Remove warehouse
- [ ] **Test 10.8:** View warehouse inventory
- [ ] **Test 10.9:** Search warehouses
- [ ] **Test 10.10:** Warehouse stock levels

**Status:** ⏸️ NOT STARTED  
**Notes:**

---

## 📊 Module 11: Dashboard & Reports
### Dashboard Operations
- [ ] **Test 11.1:** Navigate to Dashboard
- [ ] **Test 11.2:** View total sales statistics
- [ ] **Test 11.3:** View pending orders count
- [ ] **Test 11.4:** View revenue charts
- [ ] **Test 11.5:** View top products
- [ ] **Test 11.6:** View top shops
- [ ] **Test 11.7:** Date range filter on dashboard
- [ ] **Test 11.8:** Export reports (if applicable)
- [ ] **Test 11.9:** Refresh data functionality
- [ ] **Test 11.10:** Performance (page load time)

**Status:** ⏸️ NOT STARTED  
**Notes:**

---

## ⚙️ Module 12: Settings & Configuration
### Settings Operations
- [ ] **Test 12.1:** Navigate to Settings page
- [ ] **Test 12.2:** View company information
- [ ] **Test 12.3:** UPDATE - Edit company settings
- [ ] **Test 12.4:** User management (create/edit users)
- [ ] **Test 12.5:** Role permissions
- [ ] **Test 12.6:** System preferences
- [ ] **Test 12.7:** Backup database
- [ ] **Test 12.8:** Restore database (if applicable)
- [ ] **Test 12.9:** View system logs
- [ ] **Test 12.10:** Save settings successfully

**Status:** ⏸️ NOT STARTED  
**Notes:**

---

## 🔗 Module 13: API Integration Tests
### Backend API Endpoints
- [ ] **Test 13.1:** GET /api/desktop/products (list)
- [ ] **Test 13.2:** POST /api/desktop/products (create)
- [ ] **Test 13.3:** PUT /api/desktop/products/:id (update)
- [ ] **Test 13.4:** DELETE /api/desktop/products/:id
- [ ] **Test 13.5:** GET /api/desktop/shops (list)
- [ ] **Test 13.6:** GET /api/desktop/orders (list with JOINs)
- [ ] **Test 13.7:** GET /api/desktop/salesmen (list)
- [ ] **Test 13.8:** GET /api/shared/routes (list)
- [ ] **Test 13.9:** POST /api/mobile/sync/orders (simulate mobile)
- [ ] **Test 13.10:** GET /api/health (health check)

**Status:** ⏸️ NOT STARTED  
**Notes:**

---

## 📱 Module 14: Database Schema Validation
### Schema Tests
- [ ] **Test 14.1:** Verify products table has reserved_stock column
- [ ] **Test 14.2:** Verify orders table structure
- [ ] **Test 14.3:** Verify order_items table (NOT order_details)
- [ ] **Test 14.4:** Verify shops table structure
- [ ] **Test 14.5:** Verify salesmen/users tables
- [ ] **Test 14.6:** Verify foreign key constraints
- [ ] **Test 14.7:** Verify indexes exist
- [ ] **Test 14.8:** Run sample queries with JOINs
- [ ] **Test 14.9:** Test cascade deletes (if applicable)
- [ ] **Test 14.10:** Database integrity check

**Status:** ⏸️ NOT STARTED  
**Notes:**

---

## 🎯 Critical Path Test Sequence
### End-to-End Flow
1. [ ] **Login** → Create Warehouse → Create Products
2. [ ] **Create Route** → Create Shops → Assign to Route
3. [ ] **Create Salesman** → Assign Route → Test Login
4. [ ] **Verify** products/shops visible in desktop
5. [ ] **Prepare** for mobile sync testing

---

## 📝 Test Results Summary
**Total Tests:** 140+  
**Passed:** 0  
**Failed:** 0  
**Blocked:** 0  
**In Progress:** 0  

**Critical Issues Found:** None yet

**Next Steps After Desktop Testing:**
1. Populate test data (products, shops, salesmen)
2. Load mobile app with Expo Go
3. Login with salesman credentials
4. Verify data sync from backend
5. Create test order in mobile
6. Verify order syncs to backend with backend_id
7. Confirm order displays in desktop

---

**Testing Started:** [Pending]  
**Testing Completed:** [Pending]  
**Tester:** AI Assistant + User Verification  
**Environment:** Windows, SQLite, Development Mode
