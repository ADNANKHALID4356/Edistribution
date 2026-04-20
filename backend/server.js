const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '.env') });

// Use MySQL for production/standalone, SQLite ONLY for development mode
// This ensures standalone app uses MySQL (remote database with internet)
const useSQLite = process.env.USE_SQLITE === 'true' && process.env.NODE_ENV === 'development';
const db = useSQLite 
  ? require('./src/config/database-sqlite')
  : require('./src/config/database');

console.log(`📊 Database: ${useSQLite ? 'SQLite (Development Only)' : 'MySQL (Production/Remote)'}`);
if (!useSQLite) {
  console.log(`📊 MySQL Host: ${process.env.DB_HOST}`);
  console.log(`📊 MySQL Database: ${process.env.DB_NAME}`);
}

// Performance optimization middleware
const { cache, getCacheStats, clearCache } = require('./src/middleware/cache');

const app = express();

// CORS Configuration - Allow access from different origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, electron apps, etc.)
    if (!origin) return callback(null, true);
    
    // In production, check against allowed origins from environment variable
    if (process.env.NODE_ENV === 'production' && process.env.CORS_ORIGIN) {
      const allowedOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());
      
      // Check if origin is allowed or wildcard is used
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`❌ CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // Allow all origins in development
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n🌐 ${req.method} ${req.url}`);
  console.log(`📍 From: ${req.ip}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`📦 Body keys: ${Object.keys(req.body).join(', ')}`);
  }
  next();
});

// Test route
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Welcome to Distribution System API',
    company: process.env.COMPANY_NAME,
    website: process.env.COMPANY_WEBSITE,
    version: '1.0.0'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    environment: process.env.NODE_ENV
  });
});

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));

// Sprint 2: Product Management Routes
app.use('/api/desktop/products', require('./src/routes/desktop/productRoutes'));
app.use('/api/desktop/suppliers', require('./src/routes/desktop/supplierRoutes'));
app.use('/api/shared/products', require('./src/routes/shared/productRoutes'));
app.use('/api/shared/suppliers', require('./src/routes/shared/supplierRoutes'));

// Sprint 3: Shop & Route Management Routes
app.use('/api/desktop/routes', require('./src/routes/desktop/routeRoutes'));
app.use('/api/desktop/shops', require('./src/routes/desktop/shopRoutes'));
app.use('/api/shared/routes', require('./src/routes/shared/routeRoutes'));
app.use('/api/shared/shops', require('./src/routes/shared/shopRoutes'));

// Sprint 4: Salesman Management & Dashboard Routes
app.use('/api/desktop/salesmen', require('./src/routes/desktop/salesmanRoutes'));
app.use('/api/desktop/salesman-ledger', require('./src/routes/desktop/salesmanLedgerRoutes'));
app.use('/api/desktop/dashboard', require('./src/routes/desktop/dashboardRoutes'));
app.use('/api/shared/salesmen', require('./src/routes/shared/salesmanRoutes'));

// Sprint 5: Order Management Routes
app.use('/api/desktop/orders', require('./src/routes/desktop/orderRoutes'));
app.use('/api/shared/orders', require('./src/routes/shared/orderRoutes'));

// Sprint 7: Invoice & Bill Management Routes
app.use('/api/desktop/invoices', require('./src/routes/desktop/invoiceRoutes'));

// Shop Ledger System Routes
app.use('/api/desktop/ledger', require('./src/routes/desktop/ledgerRoutes'));

// Sprint 8: Warehouse & Delivery Management Routes
app.use('/api/desktop/warehouses', require('./src/routes/desktop/warehouseRoutes'));
app.use('/api/desktop/deliveries', require('./src/routes/desktop/deliveryRoutes'));

// Sprint 9: Mobile Sync Routes
app.use('/api/mobile/sync', require('./src/routes/mobile/syncRoutes'));

// Settings Routes
app.use('/api/settings', require('./src/routes/settingsRoutes'));

// Sprint 10: Stock Returns & Daily Collections
app.use('/api/desktop/stock-returns', require('./src/routes/desktop/stockReturnRoutes'));
app.use('/api/desktop/daily-collections', require('./src/routes/desktop/dailyCollectionRoutes'));

// ============================================================
// PERFORMANCE MONITORING ENDPOINTS
// ============================================================

// Cache management endpoints (admin only)
app.get('/api/admin/cache/stats', (req, res) => {
  const stats = getCacheStats();
  res.json({
    success: true,
    data: stats
  });
});

app.post('/api/admin/cache/clear', (req, res) => {
  clearCache();
  res.json({
    success: true,
    message: 'Cache cleared successfully'
  });
});

// Health check with performance metrics
app.get('/api/health/detailed', (req, res) => {
  const cacheStats = getCacheStats();
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date(),
    environment: process.env.NODE_ENV,
    database: useSQLite ? 'SQLite' : 'MySQL',
    cache: cacheStats,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5001;
// Bind to all interfaces unless specifically overridden by HOST.
// This ensures the server is accessible from localhost and network interface IPs.
const HOST = process.env.HOST || '0.0.0.0';
console.log(`[server] using host=${HOST} port=${PORT}`);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  console.error('❌ Promise:', promise);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run auto-migrations on startup (MySQL only)
if (!useSQLite) {
  const { runMigrations } = require('./src/config/migrations');
  runMigrations().catch(err => console.error('⚠️ Migration warning:', err.message));
}

const server = app.listen(PORT, HOST, () => {
  // Get actual network IP dynamically
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  let networkIP = 'Not found';
  
  // Find Wi-Fi or Ethernet IPv4 address
  Object.keys(networkInterfaces).forEach(interfaceName => {
    if (interfaceName.includes('Wi-Fi') || interfaceName.includes('Ethernet')) {
      const addresses = networkInterfaces[interfaceName];
      addresses.forEach(addr => {
        if (addr.family === 'IPv4' && !addr.internal) {
          networkIP = addr.address;
        }
      });
    }
  });

  console.log('');
  console.log('🚀 =====================================');
  console.log(`   Server running on http://${HOST}:${PORT}`);
  console.log(`   Local: http://localhost:${PORT}`);
  console.log(`   Network: http://${networkIP}:${PORT}`);
  console.log(`   📱 Mobile App: Use http://${networkIP}:${PORT}/api`);
  console.log(`   Company: ${process.env.COMPANY_NAME}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);
  console.log('   =====================================');
  console.log('');
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  }
  process.exit(1);
});

module.exports = app;
