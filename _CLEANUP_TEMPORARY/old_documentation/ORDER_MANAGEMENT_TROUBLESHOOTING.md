# Order Management System - Testing & Troubleshooting Guide

## 🔍 Quick Diagnosis

If orders are not showing in the Order Management page, follow these steps:

### Step 1: Test Backend Connection

```bash
cd backend
node test-orders.js
```

This will:
- Check if orders table exists
- Count existing orders
- Show sample orders
- Test the Order.findAll() method
- Create a sample order if none exist

### Step 2: Check Backend Server

Make sure the backend server is running:

```bash
cd backend
npm start
```

You should see:
```
📊 Database: SQLite (Development Only) or MySQL (Production/Remote)
🚀 Server running on http://0.0.0.0:5000
```

### Step 3: Check Desktop App Configuration

Verify [desktop/src/config/api.js](../desktop/src/config/api.js):

```javascript
export const BACKEND_URL = 'http://localhost:5000/api';
```

### Step 4: Test API Endpoint Directly

Open browser or Postman and test:

```
GET http://localhost:5000/api/desktop/orders
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
```

You should get:
```json
{
  "success": true,
  "data": [...orders array...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": X,
    "totalPages": Y
  }
}
```

### Step 5: Check Authentication

If you get 401 error:
1. Make sure you're logged in to the desktop app
2. Check browser console for JWT token
3. Token should be stored in `localStorage.getItem('token')`

---

## 🐛 Common Issues & Solutions

### Issue 1: "No orders found" message

**Cause:** No orders in database

**Solution:**
```bash
cd backend
node test-orders.js
```

This will create a sample order if prerequisites exist (salesman, shop, product with stock).

---

### Issue 2: Authentication Error (401)

**Cause:** JWT token expired or invalid

**Solution:**
1. Logout from desktop app
2. Login again
3. Try accessing orders page

---

### Issue 3: Connection Error

**Cause:** Backend not running or wrong API URL

**Solution:**
1. Start backend: `cd backend && npm start`
2. Check [desktop/src/config/api.js](../desktop/src/config/api.js)
3. Verify API URL matches backend port

---

### Issue 4: Empty Response with Success:True

**Cause:** Database query returns no results

**Solution:**
```bash
cd backend
node test-orders.js
```

Check:
- Do salesmen exist?
- Do shops exist?
- Do products exist?
- Were orders actually created?

---

## 📊 Manual Order Creation (SQL)

If you need to manually create test data:

```sql
-- 1. Check existing data
SELECT * FROM salesmen WHERE is_active = 1 LIMIT 1;
SELECT * FROM shops WHERE is_active = 1 LIMIT 1;
SELECT * FROM products WHERE is_active = 1 AND stock_quantity > 0 LIMIT 1;

-- 2. Create order (replace IDs with actual values)
INSERT INTO orders 
  (order_number, salesman_id, shop_id, order_date, total_amount, discount, net_amount, status, notes, created_at)
VALUES 
  ('ORD-20260123-S001-00001', 1, 1, NOW(), 1000.00, 0, 1000.00, 'placed', 'Test order', NOW());

-- 3. Get the order ID
SET @order_id = LAST_INSERT_ID();

-- 4. Create order details (replace product_id with actual)
INSERT INTO order_details 
  (order_id, product_id, quantity, unit_price, total_price, discount, net_price)
VALUES 
  (@order_id, 1, 10, 100.00, 1000.00, 0, 1000.00);
```

---

## 🧪 API Testing with Console

Open browser console on the desktop app and run:

```javascript
// Get current token
const token = localStorage.getItem('token');
console.log('Token:', token);

// Test API call
fetch('http://localhost:5000/api/desktop/orders', {
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('Orders:', data);
  console.log('Total orders:', data.pagination?.total || 0);
})
.catch(err => console.error('Error:', err));
```

---

## 📝 Logging

The system now includes comprehensive logging:

### Backend Logs
- Order controller logs all requests and responses
- Order model logs database queries
- Authentication middleware logs token verification

### Frontend Logs
- Order service logs all API calls
- OrderManagementPage logs fetch operations

**To see logs:**
1. Backend: Check terminal where `npm start` is running
2. Frontend: Open browser DevTools > Console

---

## ✅ Verification Checklist

- [ ] Backend server is running on port 5000
- [ ] Database has orders table
- [ ] Database has at least one order
- [ ] Desktop app API URL is correct
- [ ] User is logged in (JWT token exists)
- [ ] JWT token is valid (not expired)
- [ ] API returns data when called directly
- [ ] Browser console shows no errors

---

## 🚀 Next Steps After Fix

Once orders are loading:

1. **Test Filters:**
   - Search by order number
   - Filter by status
   - Filter by salesman
   - Filter by date range

2. **Test Actions:**
   - View order details
   - Update order status
   - Edit order (if status allows)
   - Delete order (if status allows)

3. **Test Pagination:**
   - Create multiple orders
   - Navigate between pages

4. **Test Statistics:**
   - Statistics cards should show correct counts
   - Total revenue should calculate correctly

---

## 📞 Support

If issues persist:

1. Check [ARCHITECTURE_ANALYSIS.md](../ARCHITECTURE_ANALYSIS.md) for system architecture
2. Check [API_DOCUMENTATION.md](../API_DOCUMENTATION.md) for API details
3. Review backend logs for specific error messages
4. Check network tab in browser DevTools

---

## 🔧 Technical Details

**Backend Route:** `/api/desktop/orders`  
**Controller:** [backend/src/controllers/orderController.js](../backend/src/controllers/orderController.js)  
**Model:** [backend/src/models/Order.js](../backend/src/models/Order.js)  
**Frontend Service:** [desktop/src/services/orderService.js](../desktop/src/services/orderService.js)  
**Frontend Page:** [desktop/src/pages/orders/OrderManagementPage.js](../desktop/src/pages/orders/OrderManagementPage.js)  

**Authentication:** JWT Bearer token required  
**Database Tables:** `orders`, `order_details`  
**Related Tables:** `salesmen`, `shops`, `routes`, `products`
