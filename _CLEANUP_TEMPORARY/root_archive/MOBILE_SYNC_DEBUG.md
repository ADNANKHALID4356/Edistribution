## Mobile Order Sync Troubleshooting Guide

## Issue: Orders Not Syncing to Backend

### Enhanced Error Logging Added ✅

**File Updated:** `mobile/src/services/syncService.js`

**New Logging:**
- Server endpoint URL
- Detailed error response (status, message, config)
- Better error message extraction

---

## Steps to Debug

### 1. Reload the Mobile App
```bash
# In Metro terminal, press:
r  # Reload app
```

### 2. Create a Test Order
1. Go to Shops → Select a shop
2. Click "Create Order"
3. Add products and submit
4. Watch console logs

### 3. Check New Error Logs

**You should now see:**
```
🌐 Sending 1 orders to backend...
🌐 Endpoint: POST /mobile/sync/orders  
🌐 Salesman ID: 1
```

**If error occurs:**
```
❌ Batch upload error: [Error details]
❌ Error details: {
  message: "...",
  response: {...},
  status: 404/500/etc,
  config: { url: "...", baseURL: "..." }
}
```

---

## Common Issues & Solutions

### Issue 1: Backend Not Running
**Error:** `Network Error` or `ECONNREFUSED`

**Solution:**
```bash
cd backend
npm start
```

**Verify:**
- Look for: `✅ Server running on port 5001`
- Test: Open `http://localhost:5001/api/health` in browser

---

### Issue 2: Wrong Backend URL
**Error:** `Network Error` or timeout

**Check Mobile Config:**
```javascript
// mobile/src/utils/serverConfig.js
DEFAULT_CONFIG = {
  host: '10.0.2.2',    // For Android Emulator
  port: '5001',
  protocol: 'http'
}
```

**Test Connection:**
```bash
# From emulator, test if backend is reachable:
adb shell ping 10.0.2.2
```

**For Physical Device:**
```javascript
// Change to your computer's actual IP
host: '192.168.1.100'  // Your IP (find with: ipconfig)
```

---

### Issue 3: Authentication Token Invalid
**Error:** `401 Unauthorized`

**Solution:**
1. Logout from mobile app
2. Login again
3. Token will refresh
4. Try creating order

---

### Issue 4: Missing/Wrong Salesman ID
**Error:** `salesmanId is required` or `400 Bad Request`

**Check User Data:**
```javascript
// In mobile app console, you should see:
🔍 Salesman ID: 1
```

**If null/undefined:**
- Admin user might not have `salesman_id`
- Backend needs to accept `user.id` as fallback

**Fix Backend (if needed):**
```javascript
// backend/src/controllers/syncController.js
const salesmanId = req.body.salesman_id || req.user.id;
```

---

### Issue 5: Database/Table Issues
**Error:** `500 Internal Server Error` or SQL errors

**Check Backend Logs:**
```bash
# Look for errors like:
❌ Error in syncOrders:
Table 'orders' doesn't exist
```

**Solution:**
```bash
cd backend
node setup-db.js  # Reset database
npm start
```

---

## Manual Backend Test

**Test sync endpoint directly:**

```bash
# PowerShell
$token = "YOUR_AUTH_TOKEN"
$body = @{
  salesman_id = 1
  device_info = @{
    device_id = "test"
    os = "android"
    app_version = "1.0.0"
  }
  orders = @(
    @{
      mobile_order_id = "TEST-001"
      shop_id = 1
      order_date = "2026-02-07"
      total_amount = 1000
      discount = 0
      net_amount = 1000
      notes = "Test order"
      items = @(
        @{
          product_id = 1
          quantity = 5
          unit_price = 200
          total_price = 1000
          discount = 0
          net_price = 1000
        }
      )
    }
  )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:5001/api/mobile/sync/orders" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body $body
```

---

## Quick Checklist

**Backend:**
- [ ] Backend server running on port 5001
- [ ] Database connected (check console)
- [ ] `/api/health` endpoint responds
- [ ] `/api/mobile/sync/orders` route exists
- [ ] No errors in backend console

**Mobile:**
- [ ] Logged in successfully
- [ ] Can see shops and products
- [ ] Order created in local SQLite
- [ ] Sync triggered (check logs)
- [ ] Using correct backend URL (10.0.2.2 for emulator)

**Network:**
- [ ] Emulator/device can reach backend
- [ ] Port 5001 not blocked by firewall
- [ ] WiFi/network connected

---

## Expected Working Flow

**1. Create Order (Mobile):**
```
📱 Order created locally
💾 Saved to SQLite
🔄 Marked as unsynced (is_synced = 0)
```

**2. Auto Sync Trigger:**
```
⏰ 30-second timer or manual sync
🔍 Found 1 unsynced orders
📤 Uploading batch 1 (1 orders)...
🌐 Sending 1 orders to backend...
```

**3. Backend Response:**
```
📡 Response received: { success: true, results: {...} }
✅ Batch uploaded: 1/1 succeeded
✅ Marking order as synced
```

**4. Verification:**
```
📊 Total: 1, Synced: 1, Pending: 0
```

---

## Next Steps

1. **Reload mobile app** to get new logs
2. **Create test order** and watch console
3. **Share error logs** if sync still fails
4. **Check backend logs** for errors

The enhanced logging will show exactly where the sync is failing!
