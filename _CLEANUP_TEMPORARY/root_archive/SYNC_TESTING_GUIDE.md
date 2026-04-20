# 🧪 SYNC TESTING GUIDE
**Quick Step-by-Step Testing Procedure**  
**Estimated Time:** 15 minutes

---

## ✅ TEST 1: Desktop to Mobile Sync (Products)

### **Objective:** Verify products created on desktop appear on mobile

**Steps:**

1. **Desktop: Create Test Product**
   - Open desktop app: http://localhost:3000
   - Login: admin / admin123
   - Navigate to: Products → Add New Product
   - Enter:
     - Product Code: `TEST001`
     - Product Name: `Test Pepsi 1.5L`
     - Category: `Beverages`
     - Unit Price: `150`
     - Stock: `100`
   - Click "Save"
   - ✅ Verify: Product appears in product list

2. **Mobile: Sync Products**
   - Open mobile app (Expo Go)
   - Login: adnan / 123 (or create salesman first)
   - Go to Dashboard
   - Click **Sync button** (top-right)
   - Wait for sync to complete
   - ✅ Verify: Shows "Synced 45 products" (or similar)

3. **Mobile: Verify Product Appears**
   - Go to: Products tab
   - Search for: `Test Pepsi`
   - ✅ Verify: Product appears with correct price Rs 150
   - ✅ Verify: Stock shows 100

**Expected Result:** ✅ Product created on desktop syncs to mobile

---

## ✅ TEST 2: Mobile to Backend Sync (Orders)

### **Objective:** Verify orders created on mobile appear on desktop

**Steps:**

1. **Desktop: Create Test Shop**
   - Navigate to: Shops → Add Shop
   - Enter:
     - Shop Code: `SHOP001`
     - Shop Name: `Test Shop - Sync Testing`
     - Owner: `Ali`
     - Phone: `03001234567`
     - City: `Lahore`
   - Click "Save"

2. **Mobile: Sync to Get New Shop**
   - Open mobile app
   - Click **Sync button**
   - Wait for sync
   - ✅ Verify: "Synced 1 shops" (or more)

3. **Mobile: Create Test Order**
   - Go to: Orders → New Order
   - Select Shop: `Test Shop - Sync Testing`
   - Add Products:
     - `Test Pepsi 1.5L` - Qty: 5
     - (Add 2-3 more products if available)
   - Click "Review Order"
   - ✅ Verify: Total amount calculated correctly
   - Click "Place Order"
   - ✅ Verify: "Order placed successfully"

4. **Mobile: Check Unsynced Count**
   - Return to Dashboard
   - ✅ Verify: Shows "1 order pending sync" badge

5. **Mobile: Sync Orders to Backend**
   - Click **"Sync Orders"** button on Dashboard
   - Confirm: "Sync 1 order(s) to server?"
   - Click "Sync Now"
   - Wait 2-3 seconds
   - ✅ Verify: "1 order(s) synced successfully!"

6. **Desktop: Verify Order Appears**
   - Go to: Orders page
   - Refresh page
   - ✅ Verify: New order appears in list
   - ✅ Verify: Order number: `ORD-20260127-XXX`
   - ✅ Verify: Shop: `Test Shop - Sync Testing`
   - ✅ Verify: Salesman: `adnan` (or logged in salesman)
   - ✅ Verify: Status: `placed`
   - Click order to view details
   - ✅ Verify: All 5 items present with correct quantities

**Expected Result:** ✅ Order created on mobile syncs to backend and appears on desktop

---

## ✅ TEST 3: Duplicate Prevention (Retry Sync)

### **Objective:** Verify duplicate orders are NOT created when syncing twice

**Steps:**

1. **Mobile: Create Another Order**
   - Create new order for same shop
   - Add 2-3 products
   - Place order
   - ✅ Verify: Dashboard shows "1 order pending sync"

2. **Mobile: First Sync**
   - Click "Sync Orders"
   - ✅ Verify: "1 order synced successfully"
   - ✅ Verify: Unsynced count drops to 0

3. **Mobile: Simulate Retry (Developer Option)**
   - Go to SQLite database manually OR
   - Create another identical order (same shop, same products, same amounts)
   - Click "Sync Orders" again

4. **Backend Console: Check Logs**
   - Open backend terminal
   - ✅ Look for: "⚠️ Duplicate order detected"
   - ✅ Verify: Shows "Returning existing order"

5. **Desktop: Verify No Duplicate**
   - Go to Orders page
   - Filter by: Today's date
   - ✅ Verify: Only ONE order exists (not two)

**Expected Result:** ✅ Duplicate detection prevents double-creation

---

## ✅ TEST 4: Deleted Product Sync

### **Objective:** Verify deleted products are removed from mobile

**Steps:**

1. **Desktop: Delete Product**
   - Go to Products page
   - Find: `Test Pepsi 1.5L`
   - Click "Delete" button
   - Confirm deletion
   - ✅ Verify: Product removed from list

2. **Mobile: Sync Products**
   - Open mobile app
   - Click **Sync button**
   - Wait for sync
   - ✅ Verify: "Synced 44 products" (one less)

3. **Mobile: Verify Product Removed**
   - Go to Products tab
   - Search for: `Test Pepsi`
   - ✅ Verify: Product NOT found
   - Try to create order
   - ✅ Verify: Product not in dropdown

**Expected Result:** ✅ Deleted products are removed from mobile after sync

---

## ✅ TEST 5: Shop Update Sync

### **Objective:** Verify shop edits on desktop sync to mobile

**Steps:**

1. **Desktop: Edit Shop**
   - Go to Shops page
   - Find: `Test Shop - Sync Testing`
   - Click "Edit"
   - Change phone to: `03009876543`
   - Add address: `Main Bazar, Street 5`
   - Click "Save"

2. **Mobile: Sync Shops**
   - Open mobile app
   - Click **Sync button**
   - Wait for sync

3. **Mobile: Verify Changes**
   - Go to Shops tab
   - Find: `Test Shop - Sync Testing`
   - Click to view details
   - ✅ Verify: Phone shows `03009876543`
   - ✅ Verify: Address shows `Main Bazar, Street 5`

**Expected Result:** ✅ Shop edits sync from desktop to mobile

---

## 🚨 COMMON ISSUES & FIXES

### **Issue 1: "No orders to sync" but badge shows 1**

**Cause:** Order still in "draft" status  
**Fix:** Open order and click "Place Order" to finalize it

### **Issue 2: Sync fails with "Not authorized"**

**Cause:** JWT token expired  
**Fix:** Logout and login again on mobile

### **Issue 3: Products don't appear after sync**

**Cause:** Backend not running or network issue  
**Fix:** 
- Check backend running on port 5000
- Check mobile network config (10.8.128.47:5000)
- Verify backend logs show "GET /api/shared/products/active"

### **Issue 4: Order sync fails with "Product not found"**

**Cause:** Product deleted from backend but still in mobile SQLite  
**Fix:** Sync products first, then create order

### **Issue 5: Desktop doesn't show new order**

**Cause:** Page not refreshed  
**Fix:** Click refresh button or reload page

---

## 📊 SYNC STATUS VERIFICATION

### **Backend Logs to Check:**

```bash
# Should see these in backend terminal:

✅ GET /api/shared/products/active 200  → Products sync
✅ GET /api/shared/shops 200           → Shops sync
✅ GET /api/shared/routes/active 200   → Routes sync
✅ POST /api/shared/orders 201         → Order creation
```

### **Mobile Logs to Check:**

```bash
# React Native console (Metro bundler):

✅ 🔄 Starting products sync...
✅ 📦 Fetched 45 products from API
✅ 🗑️  Clearing old products from SQLite...
✅ ✅ Inserted 45 fresh products
✅ ✅ Products sync completed

✅ 📤 [MOBILE SYNC] Syncing 1 orders to backend...
✅ ✅ [MOBILE SYNC] Order ORD-20260127-001 synced successfully
```

---

## ✅ SUCCESS CRITERIA

After all tests pass, you should have:

- ✅ Products created on desktop appear on mobile
- ✅ Shops created on desktop appear on mobile
- ✅ Orders created on mobile appear on desktop
- ✅ Deleted products are removed from mobile
- ✅ Duplicate orders are prevented
- ✅ Shop edits sync correctly
- ✅ Unsynced order count is accurate
- ✅ Backend logs show successful API calls
- ✅ No errors in mobile or backend console

---

## 🎯 QUICK SMOKE TEST (2 minutes)

**Fastest way to verify sync is working:**

1. Desktop: Create product "Quick Test"
2. Mobile: Click Sync button
3. Mobile: Verify "Quick Test" in products list
4. Mobile: Create order with "Quick Test"
5. Mobile: Click "Sync Orders"
6. Desktop: Verify order appears
7. ✅ **SYNC IS WORKING!**

---

**Document Version:** 1.0  
**Testing Completion Time:** ~15 minutes  
**Recommended Frequency:** After every code change to sync logic
