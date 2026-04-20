# 🏗️ DISTRIBUTION MANAGEMENT SYSTEM - COMPREHENSIVE ARCHITECTURE ANALYSIS

**Company:** Ummahtechinnovations  
**Date:** January 22, 2026  
**Version:** 1.0.0  
**Analysis Type:** Complete System Architecture Review

---

## 📋 TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Patterns](#3-architecture-patterns)
4. [Backend Architecture](#4-backend-architecture)
5. [Desktop Application Architecture](#5-desktop-application-architecture)
6. [Mobile Application Architecture](#6-mobile-application-architecture)
7. [Database Architecture](#7-database-architecture)
8. [Authentication & Security](#8-authentication--security)
9. [API Structure & Endpoints](#9-api-structure--endpoints)
10. [Data Flow & Synchronization](#10-data-flow--synchronization)
11. [Key Features & Modules](#11-key-features--modules)
12. [Development Environment](#12-development-environment)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Performance Optimizations](#14-performance-optimizations)
15. [Future Enhancement Opportunities](#15-future-enhancement-opportunities)

---

## 1. SYSTEM OVERVIEW

### **Purpose**
Enterprise-grade distribution management system for wholesale/distribution businesses handling:
- Product inventory management
- Sales force management (salesmen)
- Shop/customer management
- Order processing & tracking
- Invoice & billing management
- Delivery & warehouse operations
- Real-time synchronization (online/offline)

### **Three-Tier Architecture**
```
┌──────────────────────────────────────────────────────┐
│                PRESENTATION LAYER                     │
├──────────────────────┬───────────────────────────────┤
│   Desktop App        │      Mobile App               │
│   (React + Electron) │   (React Native + Expo)       │
│   - Admin/Manager UI │   - Salesman Field App        │
│   - Warehouse Ops    │   - Offline-First             │
└──────────────────────┴───────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                    │
│              REST API Backend (Node.js)               │
│   - Express 5.1.0                                    │
│   - JWT Authentication                                │
│   - Role-Based Access Control                         │
│   - Business Logic Processing                         │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│                     DATA LAYER                        │
├──────────────────────┬───────────────────────────────┤
│   MySQL (Production) │   SQLite (Development)        │
│   - VPS Hosted       │   - Local Testing             │
│   - Remote Access    │   - Mobile Offline            │
└──────────────────────┴───────────────────────────────┘
```

### **Deployment Modes**
1. **Development Mode:** All services on localhost (backend:5000, desktop:3000, mobile:8081)
2. **Production VPS:** Backend on VPS server (147.93.108.205:5001), clients connect remotely
3. **Standalone Mode:** Desktop app with packaged backend (Electron + bundled Node.js server)

---

## 2. TECHNOLOGY STACK

### **Backend (Node.js API Server)**
```javascript
{
  "runtime": "Node.js 18+",
  "framework": "Express 5.1.0",
  "databases": {
    "production": "MySQL 2 (mysql2 ^3.15.3)",
    "development": "SQLite (better-sqlite3 ^12.5.0)"
  },
  "authentication": "JWT (jsonwebtoken ^9.0.2)",
  "security": {
    "hashing": "bcryptjs ^3.0.3",
    "cors": "cors ^2.8.5",
    "rateLimit": "express-rate-limit ^8.2.1"
  },
  "utilities": {
    "envConfig": "dotenv ^17.2.3",
    "httpClient": "axios ^1.13.2"
  }
}
```

**Key Backend Dependencies:**
- **Express 5.1.0** - Modern web framework with async/await support
- **MySQL2** - Production database driver with promise support
- **better-sqlite3** - Fast synchronous SQLite for development
- **JWT** - Stateless authentication
- **bcryptjs** - Password hashing (10 rounds)

### **Desktop Application (Electron + React)**
```javascript
{
  "platform": "Electron 39.2.4",
  "frontend": "React 19.2.3",
  "routing": "React Router DOM ^7.9.5",
  "uiLibraries": {
    "materialUI": "@mui/material ^7.3.6",
    "tailwindCSS": "tailwindcss ^3.3.0",
    "icons": {
      "@mui/icons-material": "^7.3.6",
      "lucide-react": "^0.553.0",
      "@heroicons/react": "^2.2.0"
    }
  },
  "pdfGeneration": {
    "jspdf": "^3.0.4",
    "jspdf-autotable": "^5.0.2"
  },
  "httpClient": "axios ^1.13.2"
}
```

**Desktop Features:**
- Cross-platform (Windows, macOS, Linux)
- Hybrid architecture (React web app + Electron wrapper)
- Material-UI for professional enterprise design
- PDF invoice/report generation
- Real-time API communication

### **Mobile Application (React Native + Expo)**
```javascript
{
  "platform": "Expo SDK 54.0.25",
  "runtime": "React Native 0.81.5",
  "navigation": {
    "library": "React Navigation 7.x",
    "types": [
      "Native Stack Navigator",
      "Bottom Tab Navigator"
    ]
  },
  "offlineStorage": {
    "database": "expo-sqlite ^16.0.9",
    "asyncStorage": "@react-native-async-storage/async-storage ^2.2.0"
  },
  "backgroundSync": {
    "backgroundFetch": "expo-background-fetch ~14.0.8",
    "taskManager": "expo-task-manager ~14.0.8",
    "netInfo": "@react-native-community/netinfo ^11.4.1"
  },
  "ui": {
    "paper": "react-native-paper ^5.14.5",
    "icons": "@expo/vector-icons ^15.0.3"
  }
}
```

**Mobile Features:**
- **Offline-First Architecture** - Full SQLite database on device
- **Background Sync** - Automatic data synchronization when online
- **Cross-Platform** - iOS & Android from single codebase
- **Expo Go** - Development build for instant testing
- **Native Components** - Platform-specific UI optimization

---

## 3. ARCHITECTURE PATTERNS

### **Backend Patterns**

#### **1. MVC Pattern (Model-View-Controller)**
```
Routes → Controllers → Models → Database
  ↓         ↓            ↓
Request   Business    Data Access
Handler   Logic       Layer
```

#### **2. Repository Pattern**
```javascript
// Model Layer - Data Access Abstraction
class Product {
  static async findAll(filters) {
    // Encapsulates database query logic
    const [rows] = await db.query('SELECT * FROM products WHERE ...', params);
    return rows;
  }
}
```

#### **3. Middleware Chain Pattern**
```javascript
Route → CORS → Rate Limit → Auth → Logger → Controller → Error Handler
```

### **Frontend Patterns**

#### **1. Component-Based Architecture (React)**
```
App
├── Context Providers (Global State)
│   ├── AuthContext
│   └── ThemeContext
├── Pages (Route Components)
│   ├── DashboardPage
│   ├── ProductListPage
│   └── SalesmanListingPage
├── Components (Reusable UI)
│   ├── Navbar
│   ├── Sidebar
│   └── DataTable
└── Services (API Communication)
    ├── productService
    └── authService
```

#### **2. Context API Pattern (State Management)**
```javascript
// Global authentication state
<AuthProvider>
  <App>
    {/* All components can access auth state */}
  </App>
</AuthProvider>
```

### **Mobile Patterns**

#### **1. Offline-First Pattern**
```
User Action → Local SQLite → UI Update (Instant)
     ↓
Background Sync → API Call → Server Update
     ↓
Sync Response → Update Local DB → Update Sync Status
```

#### **2. Navigation Pattern**
```
RootNavigator
├── AuthStack (Not Logged In)
│   ├── LoginScreen
│   └── ServerConfigScreen
└── AppStack (Logged In)
    ├── Dashboard (Tab)
    ├── Products (Tab)
    ├── Orders (Tab)
    └── Shops (Tab)
```

---

## 4. BACKEND ARCHITECTURE

### **Directory Structure**
```
backend/
├── server.js                 # Entry point, Express setup
├── .env                      # Environment configuration
├── package.json              # Dependencies
├── data/                     # SQLite database (development)
│   └── distribution_system.db
└── src/
    ├── config/
    │   ├── database.js          # MySQL connection
    │   └── database-sqlite.js   # SQLite wrapper (dev mode)
    ├── middleware/
    │   ├── auth.js              # JWT verification
    │   ├── cache.js             # Performance caching
    │   └── roleCheck.js         # RBAC authorization
    ├── models/               # Data access layer
    │   ├── User.js
    │   ├── Product.js
    │   ├── Salesman.js
    │   ├── Order.js
    │   ├── Invoice.js
    │   └── ... (15+ models)
    ├── controllers/          # Business logic
    │   ├── authController.js
    │   ├── productController.js
    │   ├── salesmanController.js
    │   ├── orderController.js
    │   └── ... (14+ controllers)
    ├── routes/               # API endpoint definitions
    │   ├── authRoutes.js
    │   ├── desktop/          # Desktop-specific routes
    │   │   ├── productRoutes.js
    │   │   ├── salesmanRoutes.js
    │   │   └── ... (10+ route files)
    │   ├── mobile/           # Mobile-specific routes
    │   │   └── syncRoutes.js
    │   └── shared/           # Common routes (desktop + mobile)
    │       ├── productRoutes.js
    │       └── ... (5+ route files)
    └── utils/
        ├── generateToken.js     # JWT creation/verification
        └── validators.js        # Input validation
```

### **Request Flow**
```
1. HTTP Request (POST /api/desktop/products)
   ↓
2. CORS Middleware (validate origin)
   ↓
3. Body Parser (parse JSON)
   ↓
4. Request Logger (log request details)
   ↓
5. Route Handler (/api/desktop/products → productRoutes.js)
   ↓
6. Auth Middleware (verify JWT token)
   ↓
7. Role Check Middleware (check user permissions)
   ↓
8. Controller (productController.createProduct)
   ↓
9. Model (Product.create)
   ↓
10. Database Query (INSERT INTO products...)
   ↓
11. Response (JSON with created product)
```

### **Authentication Flow**
```javascript
// 1. Login Request
POST /api/auth/login
Body: { username: "admin", password: "admin123" }

// 2. Controller validates credentials
authController.login()
  ↓
// 3. Check user exists
User.findByUsername(username)
  ↓
// 4. Verify password
bcrypt.compare(password, hashedPassword)
  ↓
// 5. Generate JWT token
const token = jwt.sign({ id, role_id }, SECRET, { expiresIn: '30d' })
  ↓
// 6. Create session record
Session.create({ user_id, token, expires_at })
  ↓
// 7. Return token + user info
Response: {
  success: true,
  token: "eyJhbGciOiJIUzI1NiIs...",
  user: { id, username, role, salesman_id }
}

// 8. Client stores token in localStorage/AsyncStorage
// 9. Subsequent requests include token in header:
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## 5. DESKTOP APPLICATION ARCHITECTURE

### **Directory Structure**
```
desktop/
├── public/
│   ├── index.html
│   └── electron-client.js    # Electron main process
├── src/
│   ├── App.js                # Root component, routing
│   ├── index.js              # React entry point
│   ├── config/
│   │   └── api.js            # Backend URL configuration
│   ├── context/
│   │   └── AuthContext.js    # Global auth state
│   ├── components/
│   │   ├── auth/
│   │   │   ├── ProtectedRoute.js  # Route guard
│   │   │   └── RoleBasedRoute.js
│   │   ├── layout/
│   │   │   ├── Navbar.js
│   │   │   ├── Sidebar.js
│   │   │   └── Footer.js
│   │   └── common/
│   │       ├── DataTable.js
│   │       ├── Modal.js
│   │       └── LoadingSpinner.js
│   ├── pages/              # Route components
│   │   ├── LoginPage.js
│   │   ├── DashboardPage.js
│   │   ├── products/
│   │   │   ├── ProductListPage.js
│   │   │   ├── AddProductPage.js
│   │   │   └── EditProductPage.js
│   │   ├── salesmen/
│   │   │   ├── SalesmanListingPage.js
│   │   │   └── AddEditSalesmanPage.js
│   │   ├── orders/
│   │   │   └── OrderManagementPage.js
│   │   ├── invoices/
│   │   │   └── InvoiceListingPage.js
│   │   └── ... (10+ feature pages)
│   ├── services/           # API communication
│   │   ├── api.js          # Axios instance
│   │   ├── authService.js
│   │   ├── productService.js
│   │   └── ... (8+ services)
│   └── utils/
│       ├── formatters.js
│       └── validators.js
├── package.json
└── electron-builder.json   # Build configuration
```

### **Component Hierarchy**
```jsx
<HashRouter>  // Use hash routing for Electron compatibility
  <AuthProvider>  // Global authentication context
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>  // Requires authentication
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/products" element={
        <ProtectedRoute allowedRoles={['Admin', 'Manager']}>  // RBAC
          <ProductListPage />
        </ProtectedRoute>
      } />
      // ... 15+ protected routes
    </Routes>
  </AuthProvider>
</HashRouter>
```

### **State Management Strategy**
```javascript
// 1. Context API for Global State (Auth)
const AuthContext = React.createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check for stored token on mount
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token with backend
      verifyAndLoadUser(token);
    }
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// 2. Component-Level State (useState for forms, filters)
const [products, setProducts] = useState([]);
const [filters, setFilters] = useState({ search: '', category: '' });

// 3. No Redux - Keeping it simple with Context API + hooks
```

### **API Communication Pattern**
```javascript
// services/productService.js
import api from './api';  // Axios instance with base URL

export const productService = {
  // GET all products with pagination
  getAll: async (page = 1, limit = 20, filters = {}) => {
    const response = await api.get('/desktop/products', {
      params: { page, limit, ...filters }
    });
    return response.data;
  },
  
  // POST create product
  create: async (productData) => {
    const response = await api.post('/desktop/products', productData);
    return response.data;
  },
  
  // PUT update product
  update: async (id, productData) => {
    const response = await api.put(`/desktop/products/${id}`, productData);
    return response.data;
  },
  
  // DELETE product
  delete: async (id) => {
    const response = await api.delete(`/desktop/products/${id}`);
    return response.data;
  }
};

// Usage in component:
const ProductListPage = () => {
  const [products, setProducts] = useState([]);
  
  useEffect(() => {
    loadProducts();
  }, []);
  
  const loadProducts = async () => {
    try {
      const data = await productService.getAll();
      setProducts(data.products);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };
};
```

---

## 6. MOBILE APPLICATION ARCHITECTURE

### **Directory Structure**
```
mobile/
├── app/
│   └── index.tsx             # Expo Router entry
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.js  # Main navigation
│   │   ├── AuthStack.js      # Pre-login screens
│   │   └── AppStack.js       # Post-login screens
│   ├── screens/
│   │   ├── LoginScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── ProductSelectionScreen.js
│   │   ├── OrderCartScreen.js
│   │   ├── ShopListingScreen.js
│   │   └── ... (10+ screens)
│   ├── components/
│   │   ├── OrderCard.js
│   │   ├── ProductCard.js
│   │   └── ShopCard.js
│   ├── services/
│   │   ├── api.js            # Axios with dynamic URL
│   │   ├── authService.js
│   │   ├── syncService.js    # Background sync
│   │   └── orderService.js
│   ├── database/
│   │   ├── schema.js         # SQLite table definitions
│   │   └── dbHelper.js       # SQLite operations (1400+ lines)
│   ├── context/
│   │   └── AuthContext.js
│   └── utils/
│       ├── serverConfig.js   # Configurable backend URL
│       └── formatters.js
├── package.json
└── app.json                  # Expo configuration
```

### **Offline-First Architecture**

#### **SQLite Schema (20+ Tables)**
```javascript
// database/schema.js
export const ALL_TABLES = [
  // 1. Users & Authentication
  `CREATE TABLE IF NOT EXISTS users (...)`,
  `CREATE TABLE IF NOT EXISTS roles (...)`,
  
  // 2. Products & Inventory
  `CREATE TABLE IF NOT EXISTS products (...)`,
  `CREATE TABLE IF NOT EXISTS categories (...)`,
  
  // 3. Shops & Routes
  `CREATE TABLE IF NOT EXISTS shops (...)`,
  `CREATE TABLE IF NOT EXISTS routes (...)`,
  
  // 4. Orders & Order Items
  `CREATE TABLE IF NOT EXISTS orders (...)`,
  `CREATE TABLE IF NOT EXISTS order_items (...)`,
  
  // 5. Sync Metadata
  `CREATE TABLE IF NOT EXISTS sync_metadata (...)`,
  `CREATE TABLE IF NOT EXISTS sync_queue (...)`
];
```

#### **Sync Strategy**
```javascript
// 1. User Creates Order (Offline)
Order saved to local SQLite with sync_status = 'pending'
  ↓
// 2. UI Updates Immediately
Show order in "Pending Orders" list
  ↓
// 3. Background Sync (When Online)
syncService.syncOrders() runs every 15 minutes
  ↓
// 4. Upload to Backend
POST /api/mobile/sync/orders with pending orders
  ↓
// 5. Backend Processes & Returns IDs
Backend creates orders in MySQL, returns server_ids
  ↓
// 6. Update Local Database
Update local orders with server_ids, mark as 'synced'
  ↓
// 7. Conflict Resolution
If backend rejects (e.g., product out of stock), mark as 'failed'
```

#### **Database Helper Methods**
```javascript
class DatabaseHelper {
  // Initialize database
  async init() { /* Create tables, indexes */ }
  
  // Products
  async insertProduct(product) { /* ... */ }
  async getProducts(filters) { /* ... */ }
  async updateProductStock(id, quantity) { /* ... */ }
  
  // Orders
  async createOrder(order, items) { /* Transaction */ }
  async getOrders(filters) { /* ... */ }
  async getPendingOrders() { /* For sync */ }
  
  // Sync Operations
  async markAsSynced(table, localId, serverId) { /* ... */ }
  async getUnsyncedRecords(table) { /* ... */ }
  
  // 40+ more methods (1400+ lines total)
}
```

### **Navigation Flow**
```
App Launch
  ↓
Check Token in AsyncStorage
  ↓
├─ No Token → AuthStack
│    ├─ LoginScreen
│    └─ ServerConfigScreen
│
└─ Has Token → AppStack (Bottom Tabs)
     ├─ Dashboard Tab
     │    └─ DashboardScreen (stats, recent orders)
     ├─ Products Tab
     │    ├─ ProductSelectionScreen (list)
     │    └─ ProductDetailScreen
     ├─ Orders Tab
     │    ├─ OrderCartScreen (create order)
     │    └─ OrderDetailScreen
     └─ Shops Tab
          ├─ ShopListingScreen
          └─ ShopDetailScreen
```

---

## 7. DATABASE ARCHITECTURE

### **Schema Overview (20+ Tables)**

#### **Core Tables**
1. **users** - User accounts (admin, manager, salesman, warehouse)
2. **roles** - Role definitions (Admin, Manager, Salesman, Warehouse)
3. **sessions** - Active JWT sessions
4. **salesmen** - Salesman details (code, phone, commission, routes)
5. **products** - Product catalog (code, name, price, stock)
6. **suppliers** - Supplier information
7. **routes** - Delivery routes with assigned salesmen
8. **shops** - Customer shops with location, credit limit
9. **warehouses** - Warehouse locations

#### **Transactional Tables**
10. **orders** - Customer orders (shop, salesman, status)
11. **order_items** - Order line items (product, quantity, price)
12. **invoices** - Generated invoices
13. **invoice_items** - Invoice line items
14. **payments** - Payment records
15. **deliveries** - Delivery challans
16. **delivery_items** - Delivered items
17. **load_sheets** - Salesman load sheets
18. **load_sheet_items** - Load sheet items

#### **Supporting Tables**
19. **warehouse_stock** - Stock per warehouse
20. **company_settings** - Application configuration
21. **_dashboard_stats** - Cached dashboard statistics

#### **Database Views**
22. **v_dashboard_stats** - Aggregated dashboard metrics

### **Entity Relationships**
```
users ──┬─→ salesmen (user_id)
        ├─→ sessions (user_id)
        └─→ orders (salesman_id)

salesmen ──→ routes (salesman_id)

products ─┬─→ suppliers (supplier_id)
          ├─→ order_items (product_id)
          ├─→ warehouse_stock (product_id)
          └─→ load_sheet_items (product_id)

shops ─┬─→ routes (route_id)
       ├─→ orders (shop_id)
       ├─→ invoices (shop_id)
       └─→ payments (shop_id)

orders ─┬─→ order_items (order_id)
        ├─→ shops (shop_id)
        ├─→ salesmen via users (salesman_id)
        ├─→ deliveries (order_id)
        └─→ warehouses (warehouse_id)

invoices ─┬─→ invoice_items (invoice_id)
          ├─→ shops (shop_id)
          ├─→ deliveries (delivery_id)
          └─→ payments (invoice_id)
```

### **Key Schema Details**

#### **Users Table**
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,      -- bcrypt hashed
  email VARCHAR(100) UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role_id INT NOT NULL DEFAULT 1,      -- FK to roles
  is_active TINYINT DEFAULT 1,
  last_login DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### **Salesmen Table**
```sql
CREATE TABLE salesmen (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE,                  -- FK to users
  salesman_code VARCHAR(20) UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  cnic VARCHAR(20),
  address TEXT,
  city VARCHAR(50),
  hire_date DATE,
  monthly_target DECIMAL(15,2) DEFAULT 0,
  commission_percentage DECIMAL(5,2) DEFAULT 0,
  vehicle_number VARCHAR(20),
  license_number VARCHAR(30),
  is_active TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### **Products Table**
```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_code VARCHAR(50) UNIQUE,
  product_name VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  brand VARCHAR(100),
  pack_size VARCHAR(50),
  unit_price DECIMAL(10,2) NOT NULL,
  carton_price DECIMAL(10,2),
  pieces_per_carton INT DEFAULT 1,
  purchase_price DECIMAL(10,2),
  stock_quantity DECIMAL(10,2) DEFAULT 0,
  reorder_level DECIMAL(10,2) DEFAULT 0,
  supplier_id INT,                     -- FK to suppliers
  barcode VARCHAR(50),
  description TEXT,
  is_active TINYINT DEFAULT 1,
  created_by INT,                      -- FK to users
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### **Orders Table**
```sql
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  shop_id INT NOT NULL,                -- FK to shops
  salesman_id INT NOT NULL,            -- FK to users
  warehouse_id INT,                    -- FK to warehouses
  order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_amount DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  net_amount DECIMAL(15,2) DEFAULT 0,
  status ENUM('placed', 'approved', 'rejected', 'delivered') DEFAULT 'placed',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 8. AUTHENTICATION & SECURITY

### **JWT Authentication Flow**

#### **Token Structure**
```javascript
// Payload
{
  id: 1,                    // User ID
  role_id: 1,               // Role (1=Admin, 2=Manager, 3=Salesman, 4=Warehouse)
  iat: 1706112000,          // Issued at timestamp
  exp: 1708704000           // Expires in 30 days
}

// Header
{
  alg: "HS256",             // HMAC SHA-256
  typ: "JWT"
}

// Signature
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  SECRET_KEY
)
```

#### **Login Process**
```javascript
// 1. Client sends credentials
POST /api/auth/login
{
  username: "admin",
  password: "admin123"
}

// 2. Backend validates
- User.findByUsername(username)
- bcrypt.compare(password, user.password)

// 3. Generate JWT
const token = jwt.sign(
  { id: user.id, role_id: user.role_id },
  process.env.JWT_SECRET,
  { expiresIn: '30d' }
);

// 4. Create session record
await Session.create({
  user_id: user.id,
  token: token,
  device_info: req.headers['user-agent'],
  ip_address: req.ip,
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
});

// 5. Return token + user info
{
  success: true,
  token: "eyJhbGciOiJIUzI1NiIs...",
  user: {
    id: 1,
    username: "admin",
    full_name: "Administrator",
    role: "Admin",
    role_id: 1,
    salesman_id: null
  }
}
```

#### **Protected Route Middleware**
```javascript
// middleware/auth.js
exports.protect = async (req, res, next) => {
  // 1. Extract token from header
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Please login.'
    });
  }
  
  // 2. Verify JWT signature
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  // 3. Check session exists
  const session = await Session.findByToken(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      message: 'Session expired. Please login again.'
    });
  }
  
  // 4. Load user details
  const user = await User.findById(decoded.id);
  if (!user || !user.is_active) {
    return res.status(401).json({
      success: false,
      message: 'User account disabled.'
    });
  }
  
  // 5. Attach user to request
  req.user = user;
  next();
};
```

### **Role-Based Access Control (RBAC)**

#### **Roles**
```javascript
const ROLES = {
  ADMIN: 1,       // Full system access
  MANAGER: 2,     // Manage products, salesmen, orders
  SALESMAN: 3,    // Create orders, view shops, sync data
  WAREHOUSE: 4    // Manage warehouse, process deliveries
};
```

#### **Permission Matrix**
```
Feature              | Admin | Manager | Salesman | Warehouse
---------------------|-------|---------|----------|----------
Dashboard Stats      |   ✓   |    ✓    |    ✓     |    ✓
Manage Products      |   ✓   |    ✓    |    ✗     |    ✗
View Products        |   ✓   |    ✓    |    ✓     |    ✓
Manage Suppliers     |   ✓   |    ✓    |    ✗     |    ✗
Manage Salesmen      |   ✓   |    ✓    |    ✗     |    ✗
Manage Routes        |   ✓   |    ✓    |    ✗     |    ✗
Manage Shops         |   ✓   |    ✓    |    ✗     |    ✗
View Shops           |   ✓   |    ✓    |    ✓     |    ✗
Create Orders        |   ✓   |    ✓    |    ✓     |    ✗
View All Orders      |   ✓   |    ✓    |    ✗     |    ✓
View Own Orders      |   ✗   |    ✗    |    ✓     |    ✗
Manage Invoices      |   ✓   |    ✓    |    ✗     |    ✗
Manage Warehouses    |   ✓   |    ✓    |    ✗     |    ✓
Process Deliveries   |   ✓   |    ✓    |    ✗     |    ✓
Company Settings     |   ✓   |    ✗    |    ✗     |    ✗
```

#### **Middleware Implementation**
```javascript
// middleware/roleCheck.js
exports.checkRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user.role_name; // from auth middleware
    
    if (allowedRoles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }
  };
};

// Usage in routes
router.post('/products',
  protect,                             // Verify JWT
  checkRole(['Admin', 'Manager']),     // Check role
  productController.createProduct      // Controller
);
```

### **Security Measures**

#### **1. Password Security**
```javascript
// Hashing with bcrypt (10 rounds)
const hashedPassword = await bcrypt.hash(password, 10);

// Verification
const isMatch = await bcrypt.compare(inputPassword, hashedPassword);
```

#### **2. CORS Configuration**
```javascript
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow mobile apps
    
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = process.env.CORS_ORIGIN.split(',');
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      callback(null, true); // Allow all in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};
```

#### **3. Rate Limiting**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // Limit each IP to 100 requests per window
  message: 'Too many requests, please try again later.'
});

app.use('/api/', limiter);
```

#### **4. SQL Injection Prevention**
```javascript
// Using parameterized queries
const [rows] = await db.query(
  'SELECT * FROM users WHERE username = ?',
  [username]  // Parameters are escaped automatically
);
```

#### **5. Environment Variables**
```bash
# .env file (never committed to git)
JWT_SECRET=your-super-secret-key-here-minimum-32-characters
DB_PASSWORD=secure-database-password
PORT=5000
NODE_ENV=development
```

---

## 9. API STRUCTURE & ENDPOINTS

### **Base URL Structure**
```
Development:  http://localhost:5000/api
Production:   http://147.93.108.205:5001/api
```

### **API Organization**

#### **1. Authentication Routes** (`/api/auth`)
```javascript
POST   /api/auth/register        // Create new user (admin only)
POST   /api/auth/login           // Login (returns JWT token)
POST   /api/auth/logout          // Invalidate session
GET    /api/auth/me              // Get current user info
PUT    /api/auth/change-password // Change own password
```

#### **2. Desktop Product Routes** (`/api/desktop/products`)
```javascript
GET    /api/desktop/products              // List all products (paginated)
GET    /api/desktop/products/:id          // Get single product
POST   /api/desktop/products              // Create product
PUT    /api/desktop/products/:id          // Update product
DELETE /api/desktop/products/:id          // Delete product
GET    /api/desktop/products/categories   // Get unique categories
GET    /api/desktop/products/brands       // Get unique brands
POST   /api/desktop/products/bulk-import  // Bulk import from CSV
```

#### **3. Desktop Salesman Routes** (`/api/desktop/salesmen`)
```javascript
GET    /api/desktop/salesmen               // List salesmen (paginated)
GET    /api/desktop/salesmen/:id           // Get salesman details
POST   /api/desktop/salesmen               // Create salesman
PUT    /api/desktop/salesmen/:id           // Update salesman
DELETE /api/desktop/salesmen/:id           // Soft delete (is_active=0)
DELETE /api/desktop/salesmen/:id/permanent // Hard delete
GET    /api/desktop/salesmen/:id/credentials // Get login credentials
POST   /api/desktop/salesmen/:id/routes   // Assign routes
GET    /api/desktop/salesmen/:id/performance // Get performance stats
```

#### **4. Desktop Shop Routes** (`/api/desktop/shops`)
```javascript
GET    /api/desktop/shops           // List shops (paginated, filterable)
GET    /api/desktop/shops/:id       // Get shop details
POST   /api/desktop/shops           // Create shop
PUT    /api/desktop/shops/:id       // Update shop
DELETE /api/desktop/shops/:id       // Delete shop
GET    /api/desktop/shops/:id/orders // Get shop's orders
GET    /api/desktop/shops/:id/invoices // Get shop's invoices
GET    /api/desktop/shops/:id/balance  // Get shop's balance
```

#### **5. Desktop Order Routes** (`/api/desktop/orders`)
```javascript
GET    /api/desktop/orders           // List orders (filterable by status)
GET    /api/desktop/orders/:id       // Get order details with items
POST   /api/desktop/orders           // Create order
PUT    /api/desktop/orders/:id       // Update order
DELETE /api/desktop/orders/:id       // Cancel order
PUT    /api/desktop/orders/:id/approve   // Approve order
PUT    /api/desktop/orders/:id/reject    // Reject order
PUT    /api/desktop/orders/:id/deliver   // Mark as delivered
GET    /api/desktop/orders/pending       // Get pending orders
GET    /api/desktop/orders/stats         // Get order statistics
```

#### **6. Desktop Invoice Routes** (`/api/desktop/invoices`)
```javascript
GET    /api/desktop/invoices         // List invoices
GET    /api/desktop/invoices/:id     // Get invoice with items
POST   /api/desktop/invoices         // Generate invoice from delivery
PUT    /api/desktop/invoices/:id     // Update invoice
DELETE /api/desktop/invoices/:id     // Delete invoice
GET    /api/desktop/invoices/:id/pdf // Download PDF
POST   /api/desktop/invoices/:id/payment // Record payment
```

#### **7. Mobile Sync Routes** (`/api/mobile/sync`)
```javascript
POST   /api/mobile/sync/products      // Download products to mobile
POST   /api/mobile/sync/shops         // Download shops to mobile
POST   /api/mobile/sync/orders        // Upload orders from mobile
POST   /api/mobile/sync/all           // Full sync (products, shops, routes)
GET    /api/mobile/sync/status        // Get sync status
POST   /api/mobile/sync/pull          // Pull updates from server
POST   /api/mobile/sync/push          // Push local changes to server
```

#### **8. Shared Routes** (Both desktop & mobile)
```javascript
GET    /api/shared/products           // Get products (both apps)
GET    /api/shared/products/:id       // Get single product
GET    /api/shared/shops              // Get shops
GET    /api/shared/routes             // Get routes
GET    /api/shared/salesmen           // Get salesmen list
```

#### **9. Dashboard Routes** (`/api/desktop/dashboard`)
```javascript
GET    /api/desktop/dashboard/stats         // Overall statistics
GET    /api/desktop/dashboard/recent-orders // Recent orders
GET    /api/desktop/dashboard/top-products  // Top selling products
GET    /api/desktop/dashboard/low-stock     // Low stock products
GET    /api/desktop/dashboard/sales-chart   // Sales trend data
```

#### **10. Warehouse Routes** (`/api/desktop/warehouses`)
```javascript
GET    /api/desktop/warehouses          // List warehouses
GET    /api/desktop/warehouses/:id      // Get warehouse details
POST   /api/desktop/warehouses          // Create warehouse
PUT    /api/desktop/warehouses/:id      // Update warehouse
DELETE /api/desktop/warehouses/:id      // Delete warehouse
GET    /api/desktop/warehouses/:id/stock // Get stock levels
POST   /api/desktop/warehouses/:id/transfer // Transfer stock
```

### **Response Format Standard**

#### **Success Response**
```javascript
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Actual data (single object or array)
  },
  "pagination": {  // Only for paginated endpoints
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### **Error Response**
```javascript
{
  "success": false,
  "message": "Error message describing what went wrong",
  "error": {  // Only in development mode
    "stack": "Error stack trace...",
    "details": "Additional error details"
  }
}
```

---

## 10. DATA FLOW & SYNCHRONIZATION

### **Desktop App Data Flow**
```
User Action (e.g., Add Product)
  ↓
React Component (AddProductPage)
  ↓
Service Layer (productService.create)
  ↓
Axios HTTP Request → POST /api/desktop/products
  ↓
Backend API (productController.createProduct)
  ↓
Model Layer (Product.create)
  ↓
MySQL Database (INSERT)
  ↓
Response with created product
  ↓
Update Component State
  ↓
UI Re-renders with new data
```

### **Mobile App Offline-First Flow**

#### **Scenario: Salesman Creates Order (Offline)**
```
Step 1: User adds items to cart in mobile app
  └─ State managed in React component

Step 2: User submits order (no internet)
  ├─ Generate local order number: ORD-LOCAL-12345
  ├─ Save to SQLite database:
  │    INSERT INTO orders (order_number, shop_id, salesman_id, 
  │                         total_amount, status, sync_status)
  │    VALUES ('ORD-LOCAL-12345', 5, 2, 5000, 'placed', 'pending')
  │
  └─ Insert order items:
       INSERT INTO order_items (order_id, product_id, quantity, unit_price)
       VALUES (123, 10, 5, 100), (123, 15, 10, 50)

Step 3: UI immediately shows order in "My Orders" list
  └─ No waiting for server response

Step 4: Background sync runs (when internet available)
  ├─ syncService.syncOrders() executed by TaskManager
  ├─ Query pending orders from SQLite
  ├─ POST to /api/mobile/sync/orders with order data
  │
  └─ Backend processes orders:
       ├─ Validates shop exists
       ├─ Checks product availability
       ├─ Creates order in MySQL with new order_number: ORD-2024-00123
       └─ Returns server_id and server_order_number

Step 5: Update local database with sync results
  └─ UPDATE orders 
      SET sync_status = 'synced',
          server_id = 456,
          order_number = 'ORD-2024-00123'
      WHERE id = 123
```

#### **Conflict Resolution Strategy**
```javascript
// Scenario: Product price changed on server while mobile was offline

// Mobile has: Product #10, Price: 100 PKR (from yesterday)
// Server has: Product #10, Price: 120 PKR (updated today)

// Sync Process:
1. Mobile pulls latest products
   GET /api/mobile/sync/products?last_sync=2024-01-21T10:00:00

2. Backend returns updated products:
   [{ id: 10, price: 120, updated_at: '2024-01-22T08:00:00' }]

3. Mobile updates local database:
   UPDATE products SET price = 120, updated_at = '2024-01-22T08:00:00'
   WHERE id = 10

4. Mobile has pending order with old price:
   Order created: 2024-01-21T15:00:00 (offline)
   Product price at time: 100 PKR

5. Sync uploads order to server:
   POST /api/mobile/sync/orders
   { items: [{ product_id: 10, unit_price: 100 }] }

6. Backend validation:
   - Current server price: 120 PKR
   - Order price: 100 PKR
   - Conflict detected!

7. Conflict resolution options:
   Option A: Accept order with old price (allow historical pricing)
   Option B: Reject order, notify mobile app to update
   Option C: Auto-update to new price, notify salesman

   Current Implementation: Option A (accept historical pricing)
   
8. Order saved with price at time of creation (100 PKR)
```

### **Synchronization Triggers**

#### **Mobile Background Sync**
```javascript
// Configured in app.json
{
  "expo": {
    "plugins": [
      [
        "expo-background-fetch",
        {
          "android": {
            "minimumInterval": 15  // 15 minutes
          }
        }
      ]
    ]
  }
}

// Background task (runs even when app is closed)
TaskManager.defineTask('background-sync', async () => {
  try {
    console.log('🔄 Background sync started');
    
    // Check if online
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('⚠️ No internet, skipping sync');
      return BackgroundFetch.Result.NoData;
    }
    
    // Sync pending orders
    await syncService.syncOrders();
    
    // Pull latest data (products, shops)
    await syncService.pullUpdates();
    
    console.log('✅ Background sync completed');
    return BackgroundFetch.Result.NewData;
  } catch (error) {
    console.error('❌ Background sync failed:', error);
    return BackgroundFetch.Result.Failed;
  }
});
```

#### **Manual Sync (User Initiated)**
```javascript
// In mobile app dashboard
<Button onPress={handleManualSync}>
  <Icon name="refresh" />
  Sync Now
</Button>

const handleManualSync = async () => {
  setIsSyncing(true);
  try {
    await syncService.syncAll();
    Alert.alert('Success', 'Data synchronized successfully');
  } catch (error) {
    Alert.alert('Error', 'Sync failed. Please try again.');
  } finally {
    setIsSyncing(false);
  }
};
```

---

## 11. KEY FEATURES & MODULES

### **Feature 1: Product Management**
**Complexity:** ⭐⭐⭐
**Actors:** Admin, Manager
**Platforms:** Desktop

**Capabilities:**
- Add/Edit/Delete products
- Bulk import from CSV/Excel
- Category & brand management
- Stock tracking
- Barcode/QR code generation
- Product images (future)
- Pricing tiers (unit, carton)
- Reorder level alerts

**Technical Implementation:**
- Frontend: React form with Material-UI components
- Backend: `/api/desktop/products` routes
- Database: `products` table with supplier FK
- Validation: Required fields, unique product code

### **Feature 2: Salesman Management**
**Complexity:** ⭐⭐⭐⭐
**Actors:** Admin, Manager
**Platforms:** Desktop

**Capabilities:**
- Create salesman with user account
- Assign salesman code (auto-generated)
- Set commission percentage
- Assign routes to salesman
- Track performance metrics
- View salesman's orders
- Login credential management

**Technical Implementation:**
- Two-step creation: User account + Salesman record
- Password hashing with bcrypt
- Role assignment (role_id=3 for Salesman)
- Foreign key relationship: salesmen.user_id → users.id
- Route assignment: routes.salesman_id → salesmen.id

### **Feature 3: Shop/Customer Management**
**Complexity:** ⭐⭐⭐
**Actors:** Admin, Manager
**Platforms:** Desktop

**Capabilities:**
- Add/Edit/Delete shops
- Assign shop to route
- Set credit limit
- Track current balance
- GPS coordinates
- Order history
- Invoice history
- Payment records

**Technical Implementation:**
- Shop-Route relationship
- Credit limit validation on orders
- Balance calculation from invoices
- Location tracking (lat/lng)

### **Feature 4: Order Management**
**Complexity:** ⭐⭐⭐⭐⭐
**Actors:** Admin, Manager, Salesman
**Platforms:** Desktop, Mobile

**Capabilities:**
- Create order (select shop, add items)
- Order approval workflow
- Order status tracking (placed → approved → delivered)
- Order cancellation
- Order history
- Sales reports
- Discount application

**Technical Implementation:**
- Master-detail pattern (orders + order_items)
- Transaction handling (atomic order creation)
- Status state machine
- Stock validation
- Price snapshot (historical pricing)
- Offline order creation (mobile)

**Mobile-Specific:**
- Offline cart management
- Local order storage
- Background sync to server
- Conflict resolution

### **Feature 5: Invoice & Billing**
**Complexity:** ⭐⭐⭐⭐
**Actors:** Admin, Manager
**Platforms:** Desktop

**Capabilities:**
- Generate invoice from delivery
- Invoice itemization
- Tax calculation
- Discount application
- Payment recording (partial/full)
- Invoice status tracking (unpaid/partial/paid)
- PDF generation
- Print invoice

**Technical Implementation:**
- Invoice-Delivery relationship
- Payment tracking (payments table)
- Balance calculation
- PDF generation with jsPDF
- Print formatting

### **Feature 6: Warehouse Management**
**Complexity:** ⭐⭐⭐
**Actors:** Admin, Warehouse Staff
**Platforms:** Desktop

**Capabilities:**
- Manage multiple warehouses
- Track stock per warehouse
- Stock transfers between warehouses
- Stock adjustment (add/remove)
- Stock reports
- Low stock alerts

**Technical Implementation:**
- warehouse_stock junction table
- Stock movement history
- Atomic stock operations (transactions)

### **Feature 7: Delivery Management**
**Complexity:** ⭐⭐⭐⭐
**Actors:** Admin, Warehouse Staff
**Platforms:** Desktop

**Capabilities:**
- Generate delivery challan from order
- Load sheet creation
- Delivery tracking
- Delivery status updates
- Signature capture
- Delivery notes

**Technical Implementation:**
- Delivery-Order relationship
- Load sheet for salesman
- Delivery items tracking
- Status workflow

### **Feature 8: Offline Mobile App**
**Complexity:** ⭐⭐⭐⭐⭐
**Actors:** Salesman
**Platforms:** Mobile (Android/iOS)

**Capabilities:**
- Work completely offline
- Local product catalog
- Shop listing with GPS
- Create orders offline
- Order cart management
- Background data sync
- Conflict resolution
- Configurable server URL

**Technical Implementation:**
- SQLite database (20+ tables)
- Background fetch (every 15 min)
- Network status monitoring
- Sync queue management
- Last sync timestamp tracking
- Optimistic UI updates

### **Feature 9: Dashboard & Analytics**
**Complexity:** ⭐⭐⭐
**Actors:** All roles
**Platforms:** Desktop, Mobile

**Capabilities:**
- Total products, shops, salesmen
- Pending orders count
- Low stock alerts
- Recent orders
- Top selling products
- Sales trends (future)
- Revenue charts (future)

**Technical Implementation:**
- Cached statistics (v_dashboard_stats view)
- Aggregation queries
- Real-time metrics
- Role-based data filtering

### **Feature 10: User & Role Management**
**Complexity:** ⭐⭐⭐
**Actors:** Admin
**Platforms:** Desktop

**Capabilities:**
- Create users (Admin, Manager, Warehouse)
- Assign roles
- Set permissions
- Password management
- Session management
- Active user tracking

**Technical Implementation:**
- roles table with permissions JSON
- Role-based middleware
- JWT session tracking
- Password change flow

---

## 12. DEVELOPMENT ENVIRONMENT

### **Prerequisites**
```bash
# Node.js & npm
node --version  # v18.0.0 or higher
npm --version   # v9.0.0 or higher

# For desktop development
npm install -g electron
npm install -g electron-builder

# For mobile development
npm install -g expo-cli
npm install -g eas-cli  # Expo Application Services

# Database (choose one)
# Option A: MySQL (Production)
mysql --version  # 8.0 or higher

# Option B: SQLite (Development)
# No installation needed - better-sqlite3 handles it
```

### **Local Setup**

#### **1. Backend Setup**
```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env:
NODE_ENV=development
PORT=5000
USE_SQLITE=true              # Use SQLite for local development
JWT_SECRET=your-secret-key-minimum-32-characters
COMPANY_NAME=Ummahtechinnovations
CORS_ORIGIN=*

# Start backend
npm start

# Backend runs on http://localhost:5000
```

#### **2. Desktop App Setup**
```bash
cd desktop

# Install dependencies
npm install

# Create .env file (optional)
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env

# Start React dev server
npm start

# Desktop app opens at http://localhost:3000
```

#### **3. Mobile App Setup**
```bash
cd mobile

# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Scan QR code with Expo Go app on your phone
# Or press 'a' for Android emulator
# Or press 'i' for iOS simulator
```

### **Development Workflow**

#### **Backend Development**
```bash
# Install nodemon for auto-restart
npm install -D nodemon

# Add to package.json scripts:
"dev": "nodemon server.js"

# Run with hot reload
npm run dev

# The server will restart on file changes
```

#### **Desktop Development**
```bash
# React hot reload is automatic
npm start

# Build for testing
npm run build

# Test Electron app
npm run electron

# Build standalone desktop app
npm run electron:build
```

#### **Mobile Development**
```bash
# Start Expo with cache clear
npx expo start -c

# Run on specific platform
npx expo start --android
npx expo start --ios

# Build APK for testing
eas build --platform android --profile preview
```

### **Testing Credentials**
```
Admin Account:
  Username: admin
  Password: admin123
  Role: Admin (full access)

Test Salesman:
  Username: Taha
  Password: Taha9090
  Code: SM911543
  Role: Salesman
```

---

## 13. DEPLOYMENT ARCHITECTURE

### **Development Deployment (Current)**
```
┌────────────────────────────────────────────────┐
│          LOCALHOST (Development Machine)        │
├────────────────────────────────────────────────┤
│                                                 │
│  Backend (Node.js)                             │
│  ├─ Port: 5000                                 │
│  ├─ Database: SQLite                           │
│  └─ URL: http://localhost:5000/api            │
│                                                 │
│  Desktop (React + Electron)                    │
│  ├─ Port: 3000                                 │
│  └─ Connects to: http://localhost:5000        │
│                                                 │
│  Mobile (Expo Dev Server)                      │
│  ├─ Port: 8081                                 │
│  ├─ Database: SQLite on device                │
│  └─ Connects to: http://[LOCAL_IP]:5000       │
│                                                 │
└────────────────────────────────────────────────┘
```

### **Production VPS Deployment**
```
┌──────────────────────────────────────────┐
│  VPS Server (147.93.108.205)            │
├──────────────────────────────────────────┤
│                                           │
│  Nginx (Reverse Proxy)                   │
│  ├─ Port: 80 → 5001                     │
│  └─ SSL: Optional (Let's Encrypt)       │
│                                           │
│  Backend (PM2 Process Manager)           │
│  ├─ Port: 5001                           │
│  ├─ Database: MySQL                      │
│  ├─ Auto-restart on crash                │
│  └─ URL: http://147.93.108.205:5001/api │
│                                           │
│  MySQL Database                          │
│  ├─ Port: 3306                           │
│  ├─ User: distribution_user              │
│  └─ Database: distribution_db            │
│                                           │
└──────────────────────────────────────────┘

Clients (Remote Access):
├─ Desktop App (Office)
│  └─ Connects to: http://147.93.108.205:5001
└─ Mobile App (Field)
   └─ Connects to: http://147.93.108.205:5001
```

### **Standalone Desktop Deployment**
```
┌────────────────────────────────────────┐
│  Standalone Electron App (Client PC)  │
├────────────────────────────────────────┤
│                                         │
│  Electron (UI)                         │
│  └─ React frontend bundled             │
│                                         │
│  Embedded Node.js Server               │
│  ├─ Packaged with electron-builder    │
│  ├─ Port: Random (internal)            │
│  └─ Database: MySQL (remote)           │
│                                         │
│  Configuration                         │
│  └─ DB_HOST: 147.93.108.205           │
│                                         │
└────────────────────────────────────────┘

Benefits:
- No separate backend installation
- Single .exe file distribution
- Auto-update capability
- Still connects to central MySQL database
```

---

## 14. PERFORMANCE OPTIMIZATIONS

### **Backend Optimizations**

#### **1. Caching Middleware**
```javascript
// middleware/cache.js
const cache = {};

exports.cache = (duration) => {
  return (req, res, next) => {
    const key = req.originalUrl;
    const cached = cache[key];
    
    if (cached && (Date.now() - cached.timestamp) < duration) {
      console.log(`✅ Cache hit: ${key}`);
      return res.json(cached.data);
    }
    
    res.originalJson = res.json;
    res.json = (body) => {
      cache[key] = { data: body, timestamp: Date.now() };
      res.originalJson(body);
    };
    
    next();
  };
};

// Usage:
router.get('/products', cache(60000), productController.getAll);
// Cache for 60 seconds
```

#### **2. Database Query Optimization**
```javascript
// Before: Multiple queries
const products = await Product.findAll();
for (let product of products) {
  product.supplier = await Supplier.findById(product.supplier_id);
}

// After: Single query with JOIN
const products = await db.query(`
  SELECT p.*, s.supplier_name, s.supplier_code
  FROM products p
  LEFT JOIN suppliers s ON p.supplier_id = s.id
`);
```

#### **3. Pagination**
```javascript
// All list endpoints support pagination
GET /api/desktop/products?page=1&limit=20

// Implementation:
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 20;
const offset = (page - 1) * limit;

const [products] = await db.query(
  'SELECT * FROM products LIMIT ? OFFSET ?',
  [limit, offset]
);

const [countResult] = await db.query('SELECT COUNT(*) as total FROM products');
const total = countResult[0].total;

res.json({
  products,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  }
});
```

#### **4. Indexed Columns**
```sql
-- Frequently queried columns have indexes
CREATE INDEX idx_products_code ON products(product_code);
CREATE INDEX idx_orders_shop_id ON orders(shop_id);
CREATE INDEX idx_orders_salesman_id ON orders(salesman_id);
CREATE INDEX idx_orders_status ON orders(status);
```

### **Frontend Optimizations**

#### **1. Code Splitting**
```javascript
// Lazy load route components
const ProductListPage = lazy(() => import('./pages/products/ProductListPage'));
const AddProductPage = lazy(() => import('./pages/products/AddProductPage'));

// Wrap with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/products" element={<ProductListPage />} />
    <Route path="/products/add" element={<AddProductPage />} />
  </Routes>
</Suspense>
```

#### **2. Memoization**
```javascript
// Expensive calculations only run when dependencies change
const filteredProducts = useMemo(() => {
  return products.filter(p => 
    p.product_name.toLowerCase().includes(search.toLowerCase())
  );
}, [products, search]);

// Prevent unnecessary re-renders
const ProductCard = memo(({ product }) => {
  return <div>{product.product_name}</div>;
});
```

#### **3. Debounced Search**
```javascript
// Wait for user to stop typing before searching
const debouncedSearch = useMemo(
  () => debounce((value) => {
    loadProducts({ search: value });
  }, 500),
  []
);

<input 
  type="text" 
  onChange={(e) => debouncedSearch(e.target.value)}
  placeholder="Search products..."
/>
```

### **Mobile Optimizations**

#### **1. Offline Database Indexes**
```javascript
// schema.js
export const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_products_name ON products(product_name)',
  'CREATE INDEX IF NOT EXISTS idx_orders_sync ON orders(sync_status)',
  'CREATE INDEX IF NOT EXISTS idx_shops_route ON shops(route_id)'
];
```

#### **2. Batch Sync**
```javascript
// Sync multiple records in single request
const pendingOrders = await db.getUnsyncedOrders();

// Send all at once instead of one-by-one
await api.post('/mobile/sync/orders', {
  orders: pendingOrders
});
```

#### **3. Image Optimization**
```javascript
// Future feature - lazy load images
<Image 
  source={{ uri: product.image_url }}
  resizeMode="cover"
  cache="force-cache"
/>
```

---

## 15. FUTURE ENHANCEMENT OPPORTUNITIES

### **High Priority**

#### **1. Advanced Reporting & Analytics**
- Sales reports by date range, salesman, region
- Profit margin analysis
- Top customers/products
- Inventory turnover reports
- Excel/PDF export

#### **2. Payment Gateway Integration**
- Online payment collection
- Payment links for customers
- Payment reminders
- QR code payments

#### **3. Notifications System**
- Low stock alerts
- Order status updates
- Payment reminders
- Push notifications (mobile)
- Email notifications (desktop)

#### **4. Advanced Inventory Management**
- Batch/lot tracking
- Expiry date management
- Stock transfer between warehouses
- Stock adjustment history
- Inventory audit logs

### **Medium Priority**

#### **5. Multi-Language Support**
- English/Urdu toggle
- RTL support
- Localized currency

#### **6. Customer Portal**
- Self-service order placement
- Order tracking
- Invoice download
- Payment history
- Outstanding balance view

#### **7. GPS & Route Optimization**
- Real-time salesman location tracking
- Optimized route planning
- Distance calculations
- Geofencing for shop check-ins

#### **8. Barcode Scanner**
- Scan products for quick add
- Scan shop QR for quick selection
- Inventory counting with barcode

### **Low Priority**

#### **9. Multi-Tenant Support**
- Multiple companies on same platform
- Company-specific branding
- Isolated databases

#### **10. API Rate Limiting Per User**
- User-specific rate limits
- API usage tracking
- Quota management

---

## 📊 ARCHITECTURE SUMMARY

### **System Strengths**
✅ **Well-Structured:** Clear separation of concerns (MVC pattern)  
✅ **Scalable:** Modular architecture, easy to add features  
✅ **Secure:** JWT authentication, RBAC, password hashing  
✅ **Offline-First:** Mobile app works without internet  
✅ **Cross-Platform:** Windows/Mac/Linux (desktop), iOS/Android (mobile)  
✅ **Developer-Friendly:** Clear code structure, consistent patterns  
✅ **Production-Ready:** VPS deployment, MySQL support, error handling

### **Areas for Improvement**
⚠️ **Testing:** No unit tests or integration tests  
⚠️ **Documentation:** API documentation could be more detailed  
⚠️ **Error Handling:** Could be more granular with error types  
⚠️ **Logging:** No centralized logging system (Winston/Morgan)  
⚠️ **Monitoring:** No APM (Application Performance Monitoring)  
⚠️ **CI/CD:** No automated deployment pipeline

---

## 🎯 READY FOR NEW FEATURES

The architecture is **solid and well-organized**, making it straightforward to add new features:

### **Adding a New Feature - Example: "Expense Management"**

**1. Backend:**
```bash
# Create model
backend/src/models/Expense.js

# Create controller
backend/src/controllers/expenseController.js

# Create routes
backend/src/routes/desktop/expenseRoutes.js

# Update database schema
backend/src/config/database-sqlite.js  # Add expenses table
```

**2. Desktop:**
```bash
# Create pages
desktop/src/pages/expenses/ExpenseListPage.js
desktop/src/pages/expenses/AddExpensePage.js

# Create service
desktop/src/services/expenseService.js

# Add routes in App.js
```

**3. Mobile (if needed):**
```bash
# Add to schema
mobile/src/database/schema.js

# Add sync support
mobile/src/services/syncService.js
```

The modular architecture makes this process **clean and predictable**.

---

**🏆 CONCLUSION:**  
This is a **well-architected, enterprise-grade distribution management system** with a solid foundation for **continuous enhancement**. The codebase follows **best practices**, uses **modern technologies**, and is **ready for scaling** both in features and users.

Now we're ready to **professionally develop two new features** with full confidence in the system architecture! 🚀
