# VPS Deployment Instructions
## Updated Backend Files - January 17, 2026

### Overview
This document contains instructions for deploying the latest backend changes to the VPS server at `147.93.108.205`.

## Changed Files Summary

### 🔧 Modified Backend Files (15 files)
1. **backend/server.js** - Added CORS configuration, cache management endpoints, performance monitoring
2. **backend/src/config/database.js** - SQLite fallback support
3. **backend/src/config/database-sqlite.js** - Enhanced SQLite schema with roles, sessions
4. **backend/src/controllers/routeController.js** - Added area/city fields
5. **backend/src/controllers/shopController.js** - Filter invalid columns (already deployed)
6. **backend/src/models/Invoice.js** - Auto-generate invoice numbers
7. **backend/src/models/Product.js** - Removed description/created_by, optimized queries
8. **backend/src/models/Warehouse.js** - Removed reserved_stock references
9. **backend/src/routes/desktop/productRoutes.js** - Added cache middleware
10. **backend/src/routes/desktop/shopRoutes.js** - Added cache middleware
11. **backend/src/routes/shared/productRoutes.js** - Added cache middleware

### ✨ New Backend Files (4 files)
12. **backend/src/middleware/cache.js** - NEW: In-memory caching system
13. **backend/src/middleware/imageCompression.js** - NEW: Image optimization
14. **backend/src/utils/queryOptimizer.js** - NEW: Query performance monitoring
15. **backend/database/migrations/020_add_performance_indexes.sql** - NEW: Database indexes

## Deployment Steps

### Option 1: Manual Upload via FileZilla/WinSCP
1. Open FileZilla or WinSCP
2. Connect to VPS: `147.93.108.205` (Port 22, root user)
3. Navigate to remote folder: `/var/www/distribution-system/`
4. Upload all files from `VPS_UPLOAD_PACKAGE/backend/` folder maintaining folder structure
5. Restart PM2: `pm2 restart distribution-api`

### Option 2: Command Line (when VPS SSH is accessible)
```bash
# From local machine
cd "d:\SKILL\App Development\Distribution managemnt system\distribution_system-main"

# Upload files using SCP
scp -r VPS_UPLOAD_PACKAGE/backend/* root@147.93.108.205:/var/www/distribution-system/

# Connect via SSH
ssh root@147.93.108.205

# Restart backend
pm2 restart distribution-api

# Verify
pm2 logs distribution-api --lines 50
```

### Option 3: Upload via Web Panel (if available)
1. Compress VPS_UPLOAD_PACKAGE folder to ZIP
2. Upload via hosting control panel
3. Extract to `/var/www/distribution-system/`
4. SSH and restart PM2

## Post-Deployment Verification

### 1. Check Backend Status
```bash
ssh root@147.93.108.205
pm2 status
pm2 logs distribution-api --lines 20
```

### 2. Test API Endpoints
```bash
# Health check
curl http://147.93.108.205:5001/api/health

# Detailed health with cache stats
curl http://147.93.108.205:5001/api/health/detailed

# Test product list (should be cached)
curl -H "Authorization: Bearer YOUR_TOKEN" http://147.93.108.205:5001/api/desktop/products
```

### 3. Monitor Cache Performance
```bash
# Cache statistics
curl http://147.93.108.205:5001/api/admin/cache/stats

# Clear cache if needed
curl -X POST http://147.93.108.205:5001/api/admin/cache/clear
```

## Database Migration (Optional)
If adding performance indexes:
```bash
mysql -u root -p distribution_db < backend/database/migrations/020_add_performance_indexes.sql
```

## Rollback Plan
If issues occur after deployment:
```bash
# Stop PM2
pm2 stop distribution-api

# Restore from backup (if created)
cd /var/www/distribution-system
cp -r backup-YYYYMMDD/* .

# Restart
pm2 restart distribution-api
```

## Key Changes Impact

### Performance Improvements
- **API Caching**: GET requests cached for 5-10 minutes (configurable)
- **Database Indexes**: Faster queries on common search/filter operations
- **Query Optimization**: Parallel queries and batch operations
- **Image Compression**: Automatic image optimization on upload

### Bug Fixes
- Product CRUD: No more description/created_by errors ✅
- Shop Edit: Properly handles null values and field mapping ✅
- Warehouse: Removed all reserved_stock references ✅
- Routes: Now includes area/city fields ✅
- Invoice: Auto-generates unique invoice numbers ✅

### New Features
- Cache management API endpoints
- Performance monitoring dashboard
- Query statistics and optimization suggestions
- Image compression middleware

## Environment Variables
Ensure these are set in `/var/www/distribution-system/.env`:
```env
# Cache Configuration
ENABLE_CACHE=true

# CORS Configuration (add your frontend URLs)
CORS_ORIGIN=http://localhost:3000,http://147.93.108.205

# Node Environment
NODE_ENV=production
```

## Troubleshooting

### Cache Issues
```bash
# Clear all cache
curl -X POST http://147.93.108.205:5001/api/admin/cache/clear
```

### Performance Monitoring
```bash
# View slow queries in PM2 logs
pm2 logs distribution-api | grep "SLOW QUERY"
```

### Module Not Found Errors
```bash
cd /var/www/distribution-system
npm install
pm2 restart distribution-api
```

## Contact
- VPS IP: 147.93.108.205
- Backend Port: 5001
- PM2 Process: distribution-api (ID: 7)
- Database: distribution_db (MySQL 8.0.44)

## Next Steps After Deployment
1. ✅ Upload backend files
2. ✅ Restart PM2 service
3. ✅ Verify API health
4. ✅ Test cache performance
5. ✅ Rebuild desktop app ZIP with updated frontend
6. ✅ Test desktop app connection to VPS
7. ✅ Distribute new ZIP to end users

---
**Deployment Package Location**: `VPS_UPLOAD_PACKAGE/backend/`
**Timestamp**: January 17, 2026
