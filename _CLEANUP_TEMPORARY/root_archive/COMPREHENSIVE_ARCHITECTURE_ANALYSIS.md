# Deep Comprehensive Analysis: Distribution Management System

## Executive Summary

**What This App Is:**  
A complete **enterprise-grade distribution management system** designed for companies that manage warehouses, sales routes, and field operations across multiple locations. It coordinates warehouse inventory, salesman field operations (mobile), desktop admin control, order processing, invoicing, and delivery management—all in real-time with offline-first mobile sync capability.

**Who Uses It:**
- **Desktop Admins/Warehouse**: Inventory control, order approval, invoicing, delivery tracking
- **Field Salesmen** (Mobile): Place orders offline, sync when online
- **Managers**: Dashboard analytics, salesman performance tracking

**Technology Stack:**
- Backend: Node.js + Express + MySQL/SQLite
- Desktop: React 19 + Tailwind CSS + Electron + Axios
- Mobile: React Native (Expo SDK 54) + SQLite (offline)
- Database: MySQL (production) or SQLite (dev/mobile)

---

## Part 1: What Is the App Doing?

### Core Business Functions

#### 1. **Inventory Management** (Warehouse)
- Multi-warehouse stock tracking with real-time levels
- Product categorization, pricing (unit/carton), reorder levels
- Stock movements audit trail
- Warehouse-specific stock allocation
- Low stock & out-of-stock alerts

#### 2. **Sales Operations** (Desktop + Mobile)
- **Desktop**: Create orders for direct customers, manage vendor orders
- **Mobile**: Salesmen visit shops offline, create orders, sync to backend when online
- Order status tracking: placed → pending → approved → finalized → delivered
- Order approval workflow with validation

#### 3. **Route & Territory Management**
- Assign routes to salesmen
- Map shops to routes
- Daily route assignments
- Performance tracking by route/salesman

#### 4. **Invoicing & Collections**
- Auto-generate invoices from orders
- Custom invoice creation
- Payment tracking with per-invoice balance
- Shop ledger system (running balance)
- Daily collection reconciliation

#### 5. **Delivery Management**
- Load sheet creation (group orders for delivery)
- Delivery order tracking
- Proof of delivery (POD)
- Return management with stock re-entry

#### 6. **Mobile Data Sync** (Critical)
- **Offline-First**: Salesmen work offline with local SQLite database
- **Auto-Sync**: When online, sync orders + fetch updated products/shops/routes
- **Conflict Resolution**: Server data wins on conflicts
- **Incremental Sync**: Only fetch updated records since last sync
- **Retry Logic**: Automatic retry with exponential backoff on failure

---

## Part 2: Complete Data Flow & Connectivity

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│         CLOUD/VPS SERVER (147.93.108.205:5001)           │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Node.js Backend (Express + MySQL)                │   │
│  │  - 36 database tables (normalized schema)          │   │
│  │  - JWT authentication                             │   │
│  │  - Sync endpoints for mobile                       │   │
│  │  - Desktop API endpoints                          │   │
│  └────────────────────────────────────────────────────┘   │
│                          ▲                                 │
│                          │ HTTPS/REST                      │
│                          │                                 │
│             ┌────────────┴────────────┐                    │
│             │                         │                    │
└─────────────┼─────────────────────────┼──────────────────┘
              │                         │
              │ HTTP (Or HTTPS)         │ HTTP (Or HTTPS)
              │                         │
    ┌─────────▼─────────┐    ┌─────────▼─────────┐
    │   DESKTOP APP     │    │   MOBILE APP      │
    │  (React + Electron)     │  (React Native)   │
    │                         │                   │
    │  localhost:3000   │    │  WiFi/4G/5G       │
    │  ┌─────────────┐  │    │  ┌─────────────┐  │
    │  │ Login Page  │  │    │  │ Login Page  │  │
    │  ├─────────────┤  │    │  ├─────────────┤  │
    │  │ Dashboard   │  │    │  │ SQLite DB   │  │
    │  │ Orders      │  │    │  │ (Local)     │  │
    │  │ Products    │  │    │  │ ├─Products  │  │
    │  │ Invoices    │  │    │  │ ├─Shops     │  │
    │  │ Inventory   │  │    │  │ ├─Routes    │  │
    │  │ Deliveries  │  │    │  │ ├─Orders    │  │
    │  │ Collections │  │    │  │ └─Sync Meta │  │
    │  │ Settings    │  │    │  │             │  │
    │  └─────────────┘  │    │  └─────────────┘  │
    └───────┬───────────┘    └────────┬───────────┘
            │                         │
            │stores tokenin           │JWT token in
            │localStorage             │AsyncStorage
            │                         │
            └────────────┬────────────┘
                         │
                  [API Business Logic]
                         │
                  - Create Order
                  - Approve Order
                  - Sync Metadata
                  - Fetch Dashboard
                  - Upload Orders (Mobile)
                  - Download Products (Mobile)
```

### Data Flow: Desktop Login → Dashboard

```
User Action: Enter username/password
                    │
                    ▼
           POST /api/auth/login
                    │
        ┌───────────┴────────────┐
        │                        │
    [Desktop]            [Backend]
   (localhost:3000)      (:5001)
        │                        │
        │ authService.login()    │
        │─ Axios POST ──────────▶│
        │                        │
        │                    find user
        │                    bcrypt.compare(pw)
        │                    generate JWT token
        │                    save session
        │        Response: {token, user}
        │◀────────────────────────│
        │                        │
        │ localStorage.setItem(   │
        │   'token',             │
        │   'user'               │
        │ )                      │
        │                        │
        ▼                        ▼
   AuthContext updated     Session created
        │                   in database
        ▼
   Redirect to Dashboard
        │
   GET /api/desktop/dashboard/stats
        │ (Token in header)
        │────────────────────────▶
        │                 Auth middleware
        │                 verify JWT
        │                 check session
        │                 fetch user
        │       SELECT COUNT(*) FROM users,
        │       SELECT COUNT(*) FROM orders,
        │       SELECT COUNT(*) FROM products...
        │◀────────────────────────
        │
        ▼
   Display dashboard cards
   (Products, Orders, Shops, etc.)
```

### Data Flow: Mobile Order Creation → Sync → Backend

```
[MOBILE - OFFLINE PHASE]
┌────────────────────────────────────────────┐
│ Salesman visits shop (no internet)         │
│                                            │
│ 1. Select shop from local SQLite           │
│ 2. Browse products (cached locally)        │
│ 3. Create order in OrderCart               │
│ 4. Save order to SQLite:                   │
│    INSERT INTO orders (                    │
│      order_number, salesman_id,            │
│      shop_id, items[], status='draft'      │
│    )                                       │
│ 5. Order visible in "Unsynced Orders"      │
│ 6. UI shows "Not synced" badge             │
└────────────────────────────────────────────┘
           │
           │ [MOBILE - ONLINE PHASE]
           │
           ▼
      Auto-sync triggered
      (when internet returns)
           │
           ├─ Check failed_syncs queue
           ├─ Retry + exponential backoff
           └─ Sync unsyncedOrders
           │
           ▼
    POST /api/mobile/sync/orders
    {
      salesman_id: 5,
      device_info: {...},
      orders: [
        {
          mobile_order_id: "ORD-20260322-S0005-00001",
          shop_id: 12,
          order_date: "2026-03-22T10:30:00Z",
          items: [
            { product_id: 3, quantity: 10, unit_price: 100 },
            { product_id: 7, quantity: 5, unit_price: 200 }
          ],
          total_amount: 2000,
          discount: 100,
          net_amount: 1900,
          notes: "Check quality"
        }
      ]
    }
           │
           ▼
    [BACKEND PROCESSING]
    ┌─────────────────────────────────────┐
    │ 1. Auth middleware: Verify JWT      │
    │    ✓ Token valid                    │
    │    ✓ Session exists                 │
    │    ✓ User active                    │
    │                                     │
    │ 2. For each order:                  │
    │    a) Check if exists by:           │
    │       - mobile_order_id OR          │
    │       - shop_id + date + amount     │
    │                                     │
    │    b) Generate order_number:        │
    │       "ORD-20260322-S0005-00001"    │
    │                                     │
    │    c) INSERT INTO orders (          │
    │         order_number,               │
    │         salesman_id,                │
    │         shop_id,                    │
    │         order_date,                 │
    │         items,                      │
    │         status='placed'             │
    │       )                             │
    │                                     │
    │    d) DEDUCT STOCK IMMEDIATELY:    │
    │       UPDATE products SET           │
    │       stock_quantity -= qty         │
    │       WHERE id = product_id;        │
    │                                     │
    │       UPDATE warehouse_stock SET    │
    │       quantity -= qty               │
    │       WHERE product_id = ...;       │
    │                                     │
    │    e) Log stock movement to        │
    │       stock_movements table         │
    │                                     │
    │    f) Create entry in               │
    │       sync_logs (for monitoring)    │
    │                                     │
    │ 3. Return response:                  │
    │    {                                │
    │      synced_orders: [               │
    │        {                            │
    │          mobile_order_id: "...",    │
    │          backend_id: 1234,          │
    │          order_number: "ORD-...",   │
    │          status: 'synced'          │
    │        }                            │
    │      ],                             │
    │      success: count                 │
    │    }                                │
    └─────────────────────────────────────┘
           │
           ▼
    [MOBILE - RESPONSE HANDLING]
    ┌─────────────────────────────────────┐
    │ 1. For each synced_order response:  │
    │    a) UPDATE orders SET             │
    │       synced_at = NOW(),            │
    │       server_order_number = "...",  │
    │       status = 'synced'             │
    │       WHERE order_number = mobile   │
    │       _order_id                     │
    │                                     │
    │    b) Move from "Unsynced" to       │
    │       "Synced" in UI                │
    │                                     │
    │ 2. If errors:                       │
    │    a) Add to failed_syncs queue     │
    │    b) Schedule retry with backoff   │
    │    c) Show error toast to user      │
    │                                     │
    │ 3. Log sync_logs entry:             │
    │    INSERT INTO sync_logs (          │
    │      salesman_id,                   │
    │      entity_type='order',           │
    │      action='upload',               │
    │      status='success',              │
    │      records_count,                 │
    │      sync_duration_ms               │
    │    )                                │
    └─────────────────────────────────────┘
           │
           ▼
    UI Updated:
    ✓ Order shows "Synced" status
    ✓ Server order number displayed
    ✓ Ready for next order creation
```

### API Endpoint Categories

#### Authentication (Public)
```
POST   /api/auth/register          → Create user
POST   /api/auth/login              → Get JWT token + user
POST   /api/auth/logout             → Clear session
GET    /api/auth/profile (Protected) → Get current user
```

#### Desktop Order Management (Protected)
```
GET    /api/desktop/orders/?filters          → List with pagination
GET    /api/desktop/orders/:id               → Get single order + items
POST   /api/desktop/orders                   → Create new order
PUT    /api/desktop/orders/:id               → Update order
PUT    /api/desktop/orders/:id/status        → Change status
PUT    /api/desktop/orders/:id/approve       → Approve order
PUT    /api/desktop/orders/:id/finalize      → Finalize + deduct stock
```

#### Desktop Inventory (Protected)
```
GET    /api/desktop/products/?active        → List products
POST   /api/desktop/products                → Add product
PUT    /api/desktop/products/:id            → Edit product
GET    /api/desktop/warehouses              → List warehouses
GET    /api/desktop/warehouses/:id/stock    → Warehouse stock levels
```

#### Desktop Invoicing & Collections (Protected)
```
GET    /api/desktop/invoices               → List invoices
POST   /api/desktop/invoices               → Create invoice
GET    /api/desktop/invoices/:id           → Get invoice + items
PUT    /api/desktop/invoices/:id/payment   → Record payment
GET    /api/desktop/ledger/:shop_id        → Shop ledger history
GET    /api/desktop/daily-collections      → Daily payment summary
```

#### Mobile Sync (Protected)
```
POST   /api/mobile/sync/orders                  → Upload orders (batch)
GET    /api/mobile/sync/products                → Download products
GET    /api/mobile/sync/shops?salesman_id=X    → Download shops assigned
GET    /api/mobile/sync/routes?salesman_id=X   → Download routes
POST   /api/mobile/sync/status                  → Log sync event
GET    /api/mobile/sync/statistics/:salesman_id → Sync history
```

#### Shared (Desktop + Mobile, Read-only)
```
GET    /api/shared/products        → Active products catalog
GET    /api/shared/shops           → All shops
GET    /api/shared/routes          → All routes
GET    /api/shared/salesmen        → All salesmen
GET    /api/shared/suppliers       → All suppliers
```

#### Dashboard & Analytics (Protected)
```
GET    /api/desktop/dashboard/stats         → Overall KPIs
GET    /api/desktop/dashboard/quick-stats   → Quick metrics
GET    /api/desktop/dashboard/recent-orders → Last N orders
GET    /api/desktop/dashboard/low-stock     → Low stock alerts
GET    /api/desktop/dashboard/top-salesmen  → Sales performance
GET    /api/desktop/dashboard/revenue       → Revenue summary
```

---

## Part 3: How to Run (Frontend + Deployed Backend)

### Current Setup

**Frontend Running:** ✓  
- **URL**: http://localhost:3000
- **Location**: Code running from [desktop/](desktop/) directory
- **Port**: 3000 (React dev server)
- **Webpack Status**: Compiled successfully ✅

**Backend Configuration:** ✓  
- **Deployed Host**: 147.93.108.205:5001
- **API Base URL**: http://147.93.108.205:5001/api
- **Database**: MySQL (production)
- **Config File**: [desktop/src/utils/serverConfig.js](desktop/src/utils/serverConfig.js#L14-L16)

### Architecture in Use

```json
{
  "frontend": {
    "type": "React App",
    "location": "localhost:3000",
    "source": "This codebase (desktop/)",
    "env": "development"
  },
  "backend": {
    "type": "Node.js Express API",
    "location": "147.93.108.205:5001",
    "source": "Deployed on VPS",
    "env": "production"
  },
  "connection": "axios HTTP requests",
  "auth": "JWT tokens (localStorage)"
}
```

### Step-by-Step Usage

#### 1. **Frontend is Already Running**
Terminal showing "webpack compiled with 1 warning" means the React dev server is active.

#### 2. **Open in Browser**
```
http://localhost:3000
```
You'll see the **Login Page**

#### 3. **Login Credentials**
Backend contains test user:
```
Username: admin
Password: admin123
```

#### 4. **Login Flow**
1. Enter username/password
2. Click "Login"
3. Frontend sends POST to `http://147.93.108.205:5001/api/auth/login`
4. Backend verifies, returns JWT token
5. Frontend stores token in localStorage
6. Redirect to Dashboard

#### 5. **Dashboard Access**
Once logged in, you see:
- Total Products (with stock levels)
- Total Orders (by status)
- Total Deliveries
- Total Shops
- Total Salesmen
- Total Warehouses
- Quick action buttons

#### 6. **Navigate Features**
Each card is clickable:
- **Products** → Manage inventory
- **Orders** → Create/approve/track orders
- **Deliveries** → Manage delivery
- **Shops** → Customer management
- **Invoices** → Billing & payments
- **Collections** → Daily payment tracking
- **Stock Returns** → Handle returns
- **Settings** → System configuration

---

## Part 4: Default Users & Roles

### Role-Based Access Control

| Role | Can Do | Access |
|------|--------|--------|
| **Admin** | Everything | Full system access |
| **Manager** | View all, approve orders, reports | Most features except user management |
| **Warehouse** | Manage stock, create load sheets | Inventory & delivery only |
| **Salesman** | Place orders (mobile), view assigned shops | Mobile app + limited desktop |
| **Data Entry** | Add products/shops | Basic data entry only |

### Test Account
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Admin (full access)

### To Create Users
1. Login as Admin
2. Go to **Settings** → **User Management**
3. Click **Add User**
4. Fill details + assign role
5. Save

---

## Part 5: Database Schema (36 Tables)

### Core Reference Tables
- `users` - Login accounts
- `roles` - Role definitions
- `sessions` - Active sessions
- `company_settings` - System config

### Product & Inventory
- `products` - Product catalog
- `suppliers` - Vendor management
- `product_categories` - Product grouping
- `warehouse_stock` - Stock by warehouse
- `stock_movements` - Audit trail

### Customer & Territory
- `shops` - Customers/retailers
- `routes` - Delivery routes
- `salesmen` - Sales staff
- `salesman_routes` - Salesman assignment

### Transactions
- `orders` - Customer orders
- `order_details` - Order line items
- `invoices` - Billing documents
- `invoice_details` - Invoice line items
- `invoice_payments` - Payment history

### Delivery & Logistics
- `deliveries` - Delivery orders
- `delivery_items` - Delivery items
- `load_sheets` - Vehicle load plans
- `load_sheet_deliveries` - Load assignment

### Accounting
- `shop_ledger` - Customer balance tracking
- `daily_collections` - Daily payment records
- `payment_methods` - Payment type definitions

### Mobile Sync & Monitoring
- `sync_logs` - Sync operations log
- `sync_queue` - Pending sync items
- `sync_conflicts` - Conflict tracking
- `sync_statistics` - Sync performance metrics

### Security & Audit
- `audit_logs` - System changes
- `activity_logs` - User actions

---

## Part 6: Real-Time Data Flow Example

### Scenario: Mobile Salesman Syncs Orders at Day End

**10:00 AM - Salesman Offline**
```
Salesman visits Shop #5
├─ Selects products (from local SQLite cache)
├─ Creates Order: 5 × Product A, 3 × Product B
├─ Saves to local SQLite (status='draft')
└─ Mobile shows "Order saved (not synced)"
```

**3:00 PM - Salesman Goes Online (WiFi)**
```
AutoSyncService detects internet
├─ Checks failed_syncs queue (empty)
├─ Calls syncService.syncOrders()
├─ Batches orders: max 50 per request
├─ POST to /api/mobile/sync/orders
└─ Backend receives orders
```

**Backend Processing (Transactional)**
```
1. START TRANSACTION
2. For each order:
   ├─ Check if exists (by mobile_order_id)
   ├─ If new: INSERT INTO orders
   ├─ For each item:
   │  ├─ INSERT INTO order_items
   │  ├─ Deduct from products.stock_quantity
   │  ├─ Deduct from warehouse_stock.quantity
   │  └─ Log in stock_movements
   ├─ Mark order as synced
   └─ Generate server order_number
3. INSERT INTO sync_logs (success tracking)
4. COMMIT TRANSACTION
5. Return: {synced_orders: [...], success: count}
```

**Mobile Update**
```
Mobile receives response
├─ For each synced order:
│  ├─ UPDATE local order SET synced_at, server_order_number
│  └─ Move to "Synced Orders" list
├─ Log success in sync_logs
└─ UI shows "✓ 3 orders synced successfully"
```

**Desktop Admin Sees Impact Instantly**
```
Dashboard on admin desktop (http://localhost:3000)
├─ When admin refreshes or waits for auto-refresh
├─ Sees NEW order appear in /api/desktop/orders
├─ Stock levels updated (lower)
├─ Order ready for approval workflow
└─ Collection shown in daily reports
```

---

## Part 7: Key Architectural Patterns

### Pattern 1: JWT Authentication + Sessions
```javascript
// Desktop Login
POST /api/auth/login
-> Backend: verify password
-> Generate JWT token (7-day expiry)
-> Save session in DB
-> Return token to frontend
-> Frontend stores in localStorage
-> All requests include: Authorization: Bearer <token>

// On Protected Route
GET /api/desktop/orders
Header: Authorization: Bearer eyJhbGc...
-> Backend auth middleware
-> Verify token signature
-> Check session exists in DB
-> Check user is active
-> Proceed to route
```

### Pattern 2: Offline-First Mobile (Hybrid Sync)
```javascript
// Mobile Architecture
┌─ SQLite (Local)
│  ├─ products (read-only, synced)
│  ├─ shops (read-only, synced)
│  ├─ routes (read-only, synced)
│  └─ orders (read-write, synced)
│
└─ Auto-sync Service
   ├─ Monitor internet connectivity
   ├─ Download: products/shops/routes (incremental)
   ├─ Upload: orders (batch max 50)
   ├─ Retry logic: exponential backoff
   └─ Conflict resolution: server wins
```

### Pattern 3: Stock Deduction on Sync (Not Order Creation)
```javascript
// Unlike traditional systems:
// Orders don't reserve stock on creation
// Stock is deducted in REAL-TIME when synced from mobile

Mobile Order Created Offline
├─ Saved to SQLite
├─ NOT yet in backend
└─ Stock NOT yet deducted

Mobile Order Synced (Online)
├─ Inserted to backend orders table
├─ Stock IMMEDIATELY deducted
│  ├─ products.stock_quantity -= qty
│  └─ warehouse_stock.quantity -= qty
├─ Logged in stock_movements
└─ Admin sees it immediately

// This ensures: No double-counting, accurate real-time stock
```

### Pattern 4: Order Status Workflow
```
draft (locally only)
  ↓ [sync to backend]
placed (on backend)
  ↓ [admin action]
pending (awaiting approval)
  ↓ [admin approves]
approved (ready to deliver)
  ↓ [load sheet finalizes]
finalized / in_transit
  ↓ [delivery confirms POD]
delivered (complete)
```

### Pattern 5: Cache Busting & Real-Time Updates
```javascript
// Frontend prevents stale data:
dashboardService.getDashboardStats()
  ├─ Adds timestamp to query: ?_t=Date.now()
  ├─ Prevents browser cache
  └─ Always fetches fresh data

// Backend prevents cache:
res.set({
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
})
```

---

## Part 8: Security Implementation

### Authentication
- **JWT Tokens**: 7-day expiry
- **Password Hashing**: bcryptjs (salt 10)
- **Sessions Table**: Tracks all active logins
- **Token Validation**: Verify signature + session exists

### Rate Limiting
- **Sync Endpoints**: 100 requests / 15 minutes per IP
- **Login**: Prevent brute force attempts

### CORS (Cross-Origin)
```javascript
// Development: Allow all origins
// Production: Whitelist specific domains
Environment variable: CORS_ORIGIN=https://yourdomain.com
```

### Input Validation
- Email format validation
- Password minimum 6 characters
- Numeric fields type-checked
- SQL injection prevention (parameterized queries)

### Role-Based Access Control
- Every protected route checks user role
- Admin-only endpoints (settings)
- Salesman-only endpoints (mobile sync)

---

## Part 9: Current Network Status

### Your Environment
```
Local Machine: Windows 10/11
Frontend Server: localhost:3000 ✓ RUNNING
Backend Host: 147.93.108.205:5001
Network Status: Your machine → VPS connection ✗ BLOCKED

Diagnosis:
TCP Connection TestResult: FAILED
├─ Reason: Network isolation or firewall
├─ Impact: Frontend can load but API calls will fail
└─ Solution: Contact network admin or VPS provider
```

### What Happens When You Try Login

If you try to login right now:
1. ✓ Login form loads
2. ✓ You enter credentials
3. ✓ Click "Login"
4. ✗ API call fails (network unreachable)
5. ✗ Error: "Connection failed - Check server IP"

### To Get It Working
**Option 1: Restore VPS Connection**
- Contact your VPS provider
- Check firewall rules
- Verify VPS is running

**Option 2: Run Backend Locally Instead**
Replace in [desktop/src/utils/serverConfig.js](desktop/src/utils/serverConfig.js):
```javascript
// Change this:
const DEFAULT_CONFIG = {
  host: '147.93.108.205',
  port: '5001',
  protocol: 'http'
};

// To this:
const DEFAULT_CONFIG = {
  host: 'localhost',
  port: '5000',
  protocol: 'http'
};
```

Then run backend locally:
```bash
cd backend
npm install
npm start
```

---

## Part 10: Next Phase: Systematic Updates

Once you have full app access, you can:

### Phase 1: Data Analysis
- [ ] Export current data (products, orders, shops)
- [ ] Analyze business processes
- [ ] Identify improvement areas

### Phase 2: Feature Enhancement
- [ ] Add new fields to existing modules
- [ ] Create custom reports
- [ ] Implement business rules
- [ ] Add bulk operations

### Phase 3: Integration
- [ ] Connect to accounting software
- [ ] SMS/Email notifications
- [ ] Print middleware for invoices
- [ ] Geographic mapping for routes

### Phase 4: Deployment
- [ ] Move frontend to production server
- [ ] Setup SSL/HTTPS
- [ ] Configure domain name
- [ ] Automated backups

---

## Summary

**What You Have:**
- ✓ Complete React desktop frontend (localhost:3000)
- ✓ Mobile app code (React Native + Expo)
- ✓ Backend API code (Node.js + Express)
- ✓ Database schema (36 optimized tables)
- ✓ Offline-first mobile sync system
- ✓ Full features: orders, invoicing, inventory, delivery

**What's Running:**
- ✓ Frontend dev server on localhost:3000
- ✓ Backend deployed on 147.93.108.205:5001
- ✗ Network connection between frontend and backend (currently blocked)

**Next Step:**
Either restore VPS connectivity or run backend locally (instructions above).

---

**For Detailed Code Inspection:** See architecture exploration in [COMPREHENSIVE_SYNC_ANALYSIS.md](COMPREHENSIVE_SYNC_ANALYSIS.md)
