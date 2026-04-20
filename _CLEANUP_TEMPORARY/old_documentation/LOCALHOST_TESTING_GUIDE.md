# 🚀 LOCALHOST TESTING GUIDE - Distribution Management System

## 📊 COMPREHENSIVE SYSTEM ANALYSIS

### System Overview
This is an **Enterprise-Grade Distribution Management System** with three integrated components:

1. **Backend API Server** (Node.js + Express + SQLite)
2. **Desktop Application** (React + Electron)
3. **Mobile Application** (React Native + Expo)

---

## 🏗️ ARCHITECTURE ANALYSIS

### Backend Architecture
- **Framework**: Express.js 5.1.0
- **Database**: SQLite (Development) / MySQL (Production)
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcrypt password hashing, CORS protection, rate limiting
- **API Design**: RESTful with role-based access control

### Desktop Application Architecture
- **Frontend**: React 19.2.3 with React Router
- **UI Framework**: Material-UI 7.3.6 + Tailwind CSS
- **Desktop Wrapper**: Electron 39.2.4
- **State Management**: React Context + Hooks
- **Features**: Offline-capable, cross-platform Windows support

### Mobile Application Architecture
- **Framework**: Expo 54.0.25 + React Native 0.81.5
- **Navigation**: React Navigation 7.x
- **Offline Storage**: Expo SQLite for offline-first architecture
- **Sync Strategy**: Background sync when network available
- **UI**: React Native Paper 5.14.5

---

## ✅ CURRENT STATUS - ALL SYSTEMS RUNNING

### 1. Backend Server ✅
- **Status**: RUNNING
- **URL**: http://localhost:5000
- **Network URL**: http://10.8.128.28:5000
- **Database**: SQLite (data/distribution_system.db)
- **Admin User**: Created
  - Username: `admin`
  - Password: `admin123`

### 2. Desktop Application ✅
- **Status**: STARTING
- **URL**: http://localhost:3000 (auto-opens in browser)
- **API Endpoint**: http://localhost:5000/api
- **Build Tool**: React Scripts

### 3. Mobile Application ✅
- **Status**: STARTING
- **Expo Dev Server**: Running
- **API Endpoint**: http://localhost:5000/api
- **Test Methods**: 
  - Expo Go app on physical device
  - Android emulator
  - iOS simulator

---

## 🔍 DETAILED FEATURE ANALYSIS

### Backend API Features

#### Authentication & Authorization
```
✅ JWT-based authentication
✅ Role-based access control (Admin, Manager, Salesman, Warehouse)
✅ Session management
✅ Password encryption with bcrypt
```

#### Core Modules
1. **Products Management**
   - CRUD operations for products
   - Category and brand management
   - Stock tracking
   - Barcode support
   - Supplier linking

2. **Suppliers Management**
   - Supplier registration
   - Contact management
   - Balance tracking
   - Payment history

3. **Routes & Shops**
   - Route planning
   - Shop registration with geolocation
   - Route assignment to salesmen
   - Credit limit management

4. **Orders Management**
   - Order creation and tracking
   - Status workflow (placed → approved → delivered)
   - Order items with pricing
   - Discount management

5. **Warehouse Management**
   - Multi-warehouse support
   - Stock tracking per warehouse
   - Stock transfers
   - Load sheet generation

6. **Load Sheets**
   - Daily load planning for salesmen
   - Product allocation
   - Approval workflow

7. **Deliveries**
   - Delivery challan generation
   - Delivery confirmation
   - Return handling

8. **Invoices & Payments**
   - Automated invoice generation
   - Payment recording
   - Outstanding balance tracking
   - Multiple payment methods

9. **Salesmen Management**
   - Salesman registration
   - Route assignment
   - Target setting
   - Commission tracking

10. **Dashboard & Reports**
    - Real-time statistics
    - Sales analytics
    - Inventory reports
    - Performance metrics

### Desktop Application Features

#### Admin & Management Dashboard
- Real-time business metrics
- Low stock alerts
- Pending orders overview
- Sales performance charts

#### Product Management
- Add/Edit/Delete products
- Bulk import capability
- Image management
- Stock level monitoring

#### Order Management
- View all orders
- Order approval workflow
- Order tracking
- Invoice generation

#### Warehouse Operations
- Stock management
- Load sheet creation
- Delivery tracking
- Stock transfers

#### Reports & Analytics
- Sales reports
- Inventory reports
- Salesman performance
- Financial reports
- PDF export functionality

### Mobile Application Features

#### For Field Salesmen

1. **Offline-First Architecture**
   - Works without internet
   - Local SQLite database
   - Background sync when online
   - Conflict resolution

2. **Dashboard**
   - Today's targets
   - Completed orders
   - Pending deliveries
   - Performance metrics

3. **Shop Management**
   - View assigned shops
   - Route-based navigation
   - Shop details with location
   - Contact information

4. **Order Taking**
   - Browse products with images
   - Add to cart
   - Apply discounts
   - Calculate totals
   - Save draft orders

5. **Offline Sync**
   - Download route data
   - Download product catalog
   - Upload orders when online
   - Sync status indicators

6. **Load Sheet**
   - View daily load sheet
   - Product allocation
   - Stock verification

7. **Server Configuration**
   - Dynamic server URL change
   - Test connection
   - No rebuild required

---

## 🧪 TESTING INSTRUCTIONS

### Testing Backend API

#### 1. Health Check
Open browser and navigate to:
```
http://localhost:5000/api
```
Expected response:
```json
{
  "message": "Welcome to Distribution System API",
  "company": "Ummahtechinnovations",
  "version": "1.0.0"
}
```

#### 2. Login Test (Using PowerShell)
```powershell
$body = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $body -ContentType "application/json"
$response
```

Expected: JWT token and user details

#### 3. Get Products (After Login)
```powershell
$token = "YOUR_TOKEN_FROM_LOGIN"
$headers = @{
    Authorization = "Bearer $token"
}
$products = Invoke-RestMethod -Uri "http://localhost:5000/api/desktop/products" -Method Get -Headers $headers
$products
```

### Testing Desktop Application

#### Step 1: Access the Application
1. Desktop app should auto-open at http://localhost:3000
2. If not, manually open: http://localhost:3000

#### Step 2: Login
```
Username: admin
Password: admin123
```

#### Step 3: Test Core Features
1. **Dashboard**
   - ✅ View system statistics
   - ✅ Check all widgets load

2. **Products**
   - ✅ Navigate to Products section
   - ✅ Click "Add Product"
   - ✅ Fill form and save
   - ✅ Verify product appears in list

3. **Suppliers**
   - ✅ Add a new supplier
   - ✅ Edit supplier details
   - ✅ Test search functionality

4. **Routes**
   - ✅ Create a new route
   - ✅ Assign area and city

5. **Shops**
   - ✅ Add a shop
   - ✅ Assign to a route
   - ✅ Set credit limit

6. **Orders**
   - ✅ View orders list
   - ✅ Check order details
   - ✅ Test filtering

#### Step 4: Test API Integration
1. Open browser Developer Tools (F12)
2. Go to Network tab
3. Perform any action (e.g., load products)
4. Verify API calls to http://localhost:5000/api

### Testing Mobile Application

#### Prerequisites
- Install **Expo Go** app on your Android/iOS device from:
  - Google Play Store (Android)
  - Apple App Store (iOS)

#### Option 1: Test on Physical Device

1. **Ensure Same Network**
   - Your PC and mobile device must be on the same WiFi network

2. **Open Expo Go App**
   - Open Expo Go on your device

3. **Scan QR Code**
   - When Expo starts, a QR code will appear in terminal
   - Scan with Expo Go app (Android)
   - Or Camera app (iOS) - it will open in Expo Go

4. **Wait for Build**
   - First load takes 1-2 minutes
   - App will reload on your device

#### Option 2: Test on Android Emulator

1. **Install Android Studio** (if not installed)
   - Download from: https://developer.android.com/studio

2. **Start Emulator**
   - Open Android Studio → Device Manager
   - Start a virtual device

3. **Press 'a' in Expo Terminal**
   - Expo will automatically install to emulator

#### Mobile App Testing Checklist

1. **Login Screen**
   ```
   Server: Will auto-configure to http://10.8.128.28:5000/api
   Username: Create a salesman user from desktop
   Password: (set when creating salesman)
   ```

2. **Dashboard**
   - ✅ View statistics
   - ✅ Today's summary

3. **Products**
   - ✅ Browse product catalog
   - ✅ Search products
   - ✅ View product details

4. **Shops**
   - ✅ View assigned shops
   - ✅ Filter by route
   - ✅ View shop details

5. **Create Order**
   - ✅ Select a shop
   - ✅ Add products to cart
   - ✅ Set quantities
   - ✅ Apply discount
   - ✅ Save order

6. **Offline Mode Test**
   - ✅ Turn off WiFi/mobile data
   - ✅ Create an order
   - ✅ Verify order saved locally
   - ✅ Turn on internet
   - ✅ Use "Sync Orders" button
   - ✅ Verify order uploaded to backend

7. **Server Settings**
   - ✅ Go to Login → Server Settings
   - ✅ Change IP/Port if needed
   - ✅ Test connection

---

## 📱 MOBILE APP - SERVER CONFIGURATION

### For Testing on Mobile Device

If mobile app can't connect to http://localhost:5000:

1. **Find Your PC's Local IP**
   ```powershell
   ipconfig
   ```
   Look for "IPv4 Address" (e.g., 192.168.1.100)

2. **Configure Mobile App**
   - Open mobile app
   - Go to "Server Settings" (on login screen)
   - Enter your PC's IP: `192.168.1.100`
   - Port: `5000`
   - Protocol: `http`
   - Save and test connection

3. **Alternative: Use Network IP**
   - Backend already shows Network IP: `10.8.128.28:5000`
   - Mobile app is pre-configured to use this
   - Should work automatically

---

## 🔧 TROUBLESHOOTING

### Backend Issues

**Problem**: Backend won't start
```powershell
# Solution: Check if port 5000 is in use
Get-NetTCPConnection -LocalPort 5000

# Kill process using port 5000
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess -Force

# Restart backend
cd "c:\Users\Laptop House\Desktop\distribution_system-main\backend"
npm start
```

**Problem**: Database errors
```powershell
# Solution: Delete and recreate database
Remove-Item "c:\Users\Laptop House\Desktop\distribution_system-main\backend\data\distribution_system.db"
npm start
```

### Desktop App Issues

**Problem**: Desktop app won't connect to backend
- Check [desktop/src/config/api.js](desktop/src/config/api.js)
- Verify `BACKEND_URL = 'http://localhost:5000/api'`
- Check browser console (F12) for errors

**Problem**: Port 3000 already in use
```powershell
# Find and kill process
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force
```

### Mobile App Issues

**Problem**: Can't connect to backend
1. Both devices must be on same WiFi
2. Check Windows Firewall:
   ```powershell
   # Allow Node.js through firewall
   New-NetFirewallRule -DisplayName "Node.js Server" -Direction Inbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow
   ```
3. Use Server Settings in app to configure correct IP

**Problem**: Expo won't start
```powershell
# Clear Expo cache
cd "c:\Users\Laptop House\Desktop\distribution_system-main\mobile"
npx expo start --clear
```

**Problem**: Module not found errors
```powershell
# Reinstall dependencies
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json
npm install
```

---

## 🎯 TESTING SCENARIOS

### Scenario 1: Complete Order Flow

1. **Desktop - Create Test Data**
   - Login as admin
   - Create 3-5 products
   - Create 1 supplier
   - Create 1 route
   - Create 3-5 shops on that route
   - Create 1 salesman user

2. **Mobile - Salesman Login**
   - Login with salesman credentials
   - Pull to refresh data (sync)

3. **Mobile - Create Order**
   - Select a shop
   - Add products to cart
   - Set quantities
   - Save order

4. **Desktop - Approve Order**
   - View pending orders
   - Approve the order

5. **Desktop - Create Load Sheet**
   - Create load sheet for salesman
   - Add products from approved orders

6. **Mobile - View Load Sheet**
   - Refresh/sync
   - View assigned load sheet

### Scenario 2: Offline Capability

1. **Mobile - Go Offline**
   - Turn off WiFi/mobile data
   - Navigate app (should work)
   - Create 2-3 orders
   - Verify "Not Synced" indicator

2. **Mobile - Go Online**
   - Turn on internet
   - Press "Sync Orders" button
   - Verify sync successful

3. **Desktop - Verify**
   - Check orders appear in dashboard
   - All details correct

### Scenario 3: Multi-User Testing

1. Create multiple salesman users
2. Assign different routes
3. Test simultaneous orders
4. Verify data isolation

---

## 📊 DATABASE SCHEMA

### Core Tables (20+)

1. **roles** - User role definitions
2. **users** - System users
3. **salesmen** - Salesman details
4. **sessions** - Active sessions
5. **warehouses** - Warehouse locations
6. **suppliers** - Supplier information
7. **products** - Product catalog
8. **warehouse_stock** - Stock per warehouse
9. **routes** - Sales routes
10. **shops** - Customer shops
11. **orders** - Order headers
12. **order_items** - Order line items
13. **load_sheets** - Daily load planning
14. **load_sheet_items** - Load details
15. **deliveries** - Delivery tracking
16. **delivery_items** - Delivered items
17. **invoices** - Invoice headers
18. **invoice_items** - Invoice lines
19. **payments** - Payment records
20. **company_settings** - System configuration

---

## 🔒 SECURITY FEATURES

### Backend Security
- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ CORS protection
- ✅ Rate limiting
- ✅ SQL injection prevention
- ✅ Input validation
- ✅ Role-based access control

### Data Security
- ✅ Encrypted passwords
- ✅ Secure session management
- ✅ Token expiration
- ✅ Database foreign key constraints

---

## 🚀 PERFORMANCE FEATURES

### Backend Optimization
- ✅ Response caching
- ✅ Database indexing
- ✅ Efficient queries
- ✅ Connection pooling

### Mobile Optimization
- ✅ Offline-first architecture
- ✅ Local database caching
- ✅ Background sync
- ✅ Optimized images
- ✅ Lazy loading

---

## 📈 NEXT STEPS FOR PRODUCTION

1. **Backend**
   - Switch from SQLite to MySQL
   - Configure production environment variables
   - Set up proper logging
   - Implement backup strategy

2. **Desktop**
   - Build standalone Electron app
   - Create Windows installer
   - Add auto-update mechanism

3. **Mobile**
   - Build APK for Android
   - Submit to Google Play Store
   - Configure production API URLs

4. **Infrastructure**
   - Deploy backend to VPS/cloud
   - Configure domain and SSL
   - Set up monitoring
   - Configure CDN for assets

---

## ✅ TESTING COMPLETION CHECKLIST

### Backend API
- [ ] Health check endpoint responds
- [ ] Login successful
- [ ] Products CRUD working
- [ ] Suppliers CRUD working
- [ ] Routes CRUD working
- [ ] Shops CRUD working
- [ ] Orders creation working
- [ ] Authentication prevents unauthorized access

### Desktop Application
- [ ] Login successful
- [ ] Dashboard loads with statistics
- [ ] Products management working
- [ ] Suppliers management working
- [ ] Routes management working
- [ ] Shops management working
- [ ] Orders visible and filterable
- [ ] Reports generate successfully

### Mobile Application
- [ ] App installs on device
- [ ] Login successful
- [ ] Dashboard displays data
- [ ] Products list loads
- [ ] Shops list loads
- [ ] Order creation works
- [ ] Offline mode functions
- [ ] Sync uploads orders successfully
- [ ] Server configuration changeable

---

## 📞 SUPPORT & DOCUMENTATION

### Documentation Files
- [README.md](README.md) - Main documentation
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API endpoints
- [QUICK_START.md](QUICK_START.md) - Quick setup guide
- [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) - Production deployment

### Default Credentials
```
Admin Login:
Username: admin
Password: admin123

⚠️ IMPORTANT: Change password immediately after first login!
```

### System URLs (Current Session)
```
Backend API:     http://localhost:5000
Desktop Web:     http://localhost:3000
Mobile Expo:     Check terminal for QR code

Network Access:
Backend:         http://10.8.128.28:5000
Mobile API:      http://10.8.128.28:5000/api
```

---

## 🎉 CONCLUSION

Your Distribution Management System is now running locally with all three components:

✅ **Backend** - Running on port 5000 with SQLite database
✅ **Desktop** - Starting on port 3000
✅ **Mobile** - Expo server starting

All components are configured to work together on localhost. You can now:
1. Test all features using the admin account
2. Create test data (products, shops, routes)
3. Test mobile app on your device
4. Verify offline capabilities
5. Explore the complete order-to-delivery workflow

**Happy Testing! 🚀**

---

*Document Version: 1.0*  
*Date: January 22, 2026*  
*System: Distribution Management System v1.0.0*
