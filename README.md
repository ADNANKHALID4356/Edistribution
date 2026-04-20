# 📦 Distribution Management System

> **Enterprise-grade distribution management system with Desktop and Mobile applications for comprehensive warehouse, sales, and field operations management**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/ADNANKHALID4356/distribution_system)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-19.2.0-61dafb.svg)](https://reactjs.org/)
[![Expo](https://img.shields.io/badge/expo-~54.0.25-000020.svg)](https://expo.dev/)

---

## 🚀 Quick Start for Production Deployment

**For deployment teams and system administrators:**

1. **📖 Start Here**: [QUICK_START.md](QUICK_START.md) - User-friendly deployment guide
2. **📋 Detailed Guide**: [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) - Complete step-by-step instructions
3. **✅ Pre-Push Checklist**: [PRE_PUSH_CHECKLIST.md](PRE_PUSH_CHECKLIST.md) - Before pushing to GitHub

**Quick Deploy Steps:**
```bash
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/distribution-system.git
cd distribution-system

# 2. Setup backend
cd backend
cp .env.example .env
# Edit .env with your production values
npm install
npm start

# 3. Build desktop app
cd ../desktop
cp .env.example .env
npm install
npm run build

# 4. Deploy to server (see PRODUCTION_DEPLOYMENT.md for details)
```

**Default Admin Login:**
- Username: `admin`
- Password: `admin123`
- ⚠️ Change immediately after first login!

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Building](#building)
- [Deployment](#deployment)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

---

## 🎯 Overview

The **Distribution Management System** is a comprehensive business solution designed for distribution companies to manage their entire operation from warehouse to field sales. The system consists of three integrated components:

- **🖥️ Desktop Application** - Windows-based admin and warehouse management
- **📱 Mobile Application** - Android app for field salesmen
- **🔌 Backend API** - RESTful API server with MySQL database

### Key Business Capabilities

- Complete product catalog and inventory management
- Supplier and shop/customer relationship management
- Route planning and salesman assignments
- Order management with real-time updates
- Invoice and billing automation
- Warehouse stock tracking with multiple locations
- Load sheet management for deliveries
- Mobile offline sync for field operations
- Comprehensive dashboard and reporting

---

## ✨ Features

### Desktop Application Features

#### 🏢 **Warehouse & Inventory**
- ✅ Multi-warehouse stock management
- ✅ Real-time inventory tracking
- ✅ Stock transfer between warehouses
- ✅ Low stock alerts and notifications
- ✅ Product categorization and search

#### 👥 **User Management**
- ✅ Role-based access control (Admin, Warehouse, Salesman)
- ✅ Salesman profile management
- ✅ Route and territory assignments
- ✅ Performance tracking

#### 📊 **Orders & Invoicing**
- ✅ Order processing and approval workflow
- ✅ Automated invoice generation from orders
- ✅ Custom invoice creation with manual items
- ✅ Professional invoice numbering (INV-YYYYMMDD-XXXX)
- ✅ Shop ledger integration with automatic balance tracking
- ✅ Price list management
- ✅ Payment tracking and history
- ✅ PDF export capabilities
- ✅ Full SQLite/MySQL database compatibility

#### 🚚 **Delivery Management**
- ✅ Load sheet creation and management
- ✅ Delivery tracking
- ✅ Return management
- ✅ Proof of delivery

#### 📈 **Dashboard & Reports**
- ✅ Real-time business metrics
- ✅ Sales analytics
- ✅ Inventory reports
- ✅ Salesman performance reports

### Mobile Application Features

#### 📱 **Field Operations**
- ✅ Offline-first architecture with SQLite
- ✅ Shop visit management
- ✅ Order placement from field
- ✅ Real-time price list access
- ✅ Customer information lookup

#### 🔄 **Data Synchronization**
- ✅ Automatic sync when online
- ✅ Conflict resolution
- ✅ Incremental updates
- ✅ Background sync support

#### 📍 **Route Management**
- ✅ Daily route assignments
- ✅ Shop location mapping
- ✅ Visit history tracking

---

## 🏗️ System Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUD/VPS SERVER                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Node.js Backend API (Express)                        │  │
│  │  - RESTful API Endpoints                              │  │
│  │  - JWT Authentication                                 │  │
│  │  - Business Logic Layer                               │  │
│  │  - Rate Limiting & Security                           │  │
│  └───────────────────┬──────────────────────────────────┘  │
│                      │                                       │
│  ┌───────────────────▼──────────────────────────────────┐  │
│  │  MySQL Database                                        │  │
│  │  - 36 Tables (normalized schema)                      │  │
│  │  - Foreign Key Constraints                            │  │
│  │  - Transactions & ACID Compliance                     │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                    HTTPS/REST API
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼──────┐     ┌────▼──────┐     ┌────▼──────┐
   │  Desktop  │     │  Mobile   │     │  Mobile   │
   │   Admin   │     │ Salesman  │     │ Salesman  │
   │ (Windows) │     │ (Android) │     │ (Android) │
   └───────────┘     └───────────┘     └───────────┘
```

### Database Schema

The system uses a normalized MySQL database with 36 tables:

**Core Entities:**
- Users & Roles
- Products & Categories
- Suppliers
- Shops/Customers
- Routes & Territories
- Warehouses

**Transactional Tables:**
- Orders & Order Items
- Invoices & Invoice Items
- Load Sheets & Deliveries
- Payments
- Stock Movements

**Configuration:**
- Company Settings
- Price Lists
- System Logs

---

## 💻 Technology Stack

### Backend
- **Runtime:** Node.js v18+
- **Framework:** Express.js v5
- **Database:** MySQL 8.0+ / SQLite (dev)
- **Authentication:** JWT (JSON Web Tokens)
- **Security:** bcryptjs, express-rate-limit
- **ORM:** mysql2 (raw SQL queries for performance)

### Desktop Application
- **Framework:** Electron v39
- **UI Library:** React 19
- **Styling:** TailwindCSS 3
- **UI Components:** Material-UI (MUI) v7, Headless UI
- **Icons:** Heroicons, Lucide React
- **Routing:** React Router v7
- **PDF Generation:** jsPDF + jspdf-autotable
- **HTTP Client:** Axios

### Mobile Application
- **Framework:** React Native via Expo SDK 54
- **Navigation:** React Navigation v7
- **UI Library:** React Native Paper v5
- **Local Database:** expo-sqlite / op-sqlite
- **Storage:** AsyncStorage
- **Network:** NetInfo for connectivity detection
- **Background Tasks:** expo-background-fetch

### Development Tools
- **Package Manager:** npm
- **Build Tool:** pkg (backend), electron-builder (desktop), EAS Build (mobile)
- **Version Control:** Git

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **Node.js** (v18.0.0 or higher)
   ```bash
   node --version  # Should be v18+
   ```

2. **MySQL** (v8.0 or higher) - For production
   - MySQL Server
   - MySQL Workbench (recommended)

3. **Git** (latest version)
   ```bash
   git --version
   ```

### Platform-Specific Requirements

#### For Desktop Development (Windows)
- Windows 10 or higher
- Visual Studio Build Tools (for native modules)

#### For Mobile Development (Android)
- Expo CLI
- Android Studio (for local builds) or EAS Build account

### Optional but Recommended
- **VS Code** - Recommended IDE
- **Postman** - API testing
- **MySQL Workbench** - Database management

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ADNANKHALID4356/distribution_system.git
cd distribution_system
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Edit .env file with your MySQL credentials
# Update: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET

# Initialize database (creates tables and schema)
# Import the database schema using:
mysql -u root -p distribution_system_db < database/create_db.sql

# Optional: Import sample data
mysql -u root -p distribution_system_db < database/seeds.sql

# Start development server
npm run dev
```

The backend API will be available at `http://localhost:5000`

### 3. Desktop Application Setup

```bash
cd desktop

# Install dependencies
npm install

# Start development server
npm start

# For Electron development (optional)
npm run electron:dev
```

The React app will open at `http://localhost:3000`

### 4. Mobile Application Setup

```bash
cd mobile

# Install dependencies
npm install

# Start Expo development server
npm start

# Or run on Android emulator
npm run android

# Or run on physical device
# Scan the QR code with Expo Go app
```

---

## ⚙️ Configuration

### Backend Configuration (.env)

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=distribution_system_db
DB_PORT=3306

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRE=7d

# Company Info
COMPANY_NAME=Your Company Name
COMPANY_WEBSITE=ummahtechinnovations.com

# Currency
DEFAULT_CURRENCY=PKR
USD_TO_PKR_RATE=280
```

### Desktop Configuration

The desktop app uses dynamic server configuration. On first launch:

1. Click the **Settings/Config** icon
2. Enter your server details:
   - **Host:** IP address or domain of backend server
   - **Port:** Usually 5000
   - **Protocol:** http or https
3. Save configuration

### Mobile Configuration

Edit `mobile/src/services/api.js`:

```javascript
const BASE_URL = 'http://YOUR_SERVER_IP:5000/api';
```

Replace `YOUR_SERVER_IP` with your actual backend server address.

---

## 🔨 Building

### Build Backend Executable

```bash
cd backend
npm run build-standalone
```

Output: `desktop/backend-standalone/backend.exe`

### Build Desktop Application

```bash
cd desktop

# Build React app
npm run build

# Build Electron executable (Windows)
npm run electron:build
```

Output: `desktop/dist-standalone/`

### Build Mobile APK

#### Option 1: EAS Build (Cloud - Recommended)

```bash
cd mobile

# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build APK
eas build --platform android --profile preview
```

#### Option 2: Local Build

```bash
cd mobile

# Generate Android project
npx expo prebuild

# Build APK
cd android
./gradlew assembleRelease
```

See [mobile/APK_BUILD_GUIDE.md](mobile/APK_BUILD_GUIDE.md) for detailed instructions.

---

## 🚀 Deployment

### Production Deployment Options

#### Option 1: Cloud VPS (Recommended)
- **Providers:** AWS, DigitalOcean, Linode, Vultr
- **Requirements:** 2GB RAM, 2 CPU cores, 20GB storage
- **Database:** Managed MySQL (RDS, etc.) or self-hosted

#### Option 2: Shared Hosting with MySQL
- **Providers:** Hostinger, Bluehost, SiteGround
- **Requirements:** Node.js support, MySQL database
- **Note:** Check Node.js version compatibility

### Deployment Steps

1. **Prepare Server:**
   ```bash
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install PM2 for process management
   sudo npm install -g pm2
   ```

2. **Configure Database:**
   - Create MySQL database
   - Create database user with remote access
   - Import schema: `mysql -u user -p dbname < create_db.sql`
   - Update firewall to allow port 3306

3. **Deploy Backend:**
   ```bash
   # Upload backend files to server
   scp -r backend/ user@server:/var/www/distribution-backend/

   # On server:
   cd /var/www/distribution-backend
   npm install --production
   cp .env.example .env
   # Edit .env with production values
   
   # Start with PM2
   pm2 start server.js --name distribution-api
   pm2 save
   pm2 startup
   ```

4. **Configure Clients:**
   - Desktop: Users configure server IP on first launch
   - Mobile: Build APK with production API URL

See [DEPLOYMENT_GUIDE_CENTRAL_SERVER.md](DEPLOYMENT_GUIDE_CENTRAL_SERVER.md) for detailed deployment instructions.

---

## 📖 Usage

### Default Credentials (Development)

**Admin Account:**
- Username: `admin`
- Password: `admin123`

**Salesman Accounts:**
- Usernames: `Salesman1` through `Salesman10`
- Passwords: `Salesman1##` through `Salesman10##`

⚠️ **IMPORTANT:** Change default passwords in production!

### Desktop Application Usage

1. **Login** with admin credentials
2. **Configure Products** - Add products, suppliers, categories
3. **Setup Warehouses** - Define warehouse locations
4. **Manage Routes** - Create sales routes
5. **Add Salesmen** - Register field salesmen with login credentials
6. **Process Orders** - Review and approve orders
7. **Generate Invoices** - Create invoices and bills
8. **Track Deliveries** - Manage load sheets and deliveries

### Mobile Application Usage

1. **Login** with salesman credentials
2. **View Route** - See assigned shops and route
3. **Visit Shops** - Navigate to shop locations
4. **Place Orders** - Create orders with current price list
5. **Sync Data** - Automatic sync when connected to internet

---

## 📚 API Documentation

### Authentication

All API requests require JWT token authentication (except login):

```
Authorization: Bearer <token>
```

### Core Endpoints

#### Authentication
```
POST   /api/auth/login           # User login
POST   /api/auth/logout          # User logout
GET    /api/auth/me              # Get current user
```

#### Products
```
GET    /api/desktop/products                # List all products
POST   /api/desktop/products                # Create product
GET    /api/desktop/products/:id            # Get product details
PUT    /api/desktop/products/:id            # Update product
DELETE /api/desktop/products/:id            # Delete product
GET    /api/shared/products                 # Products for mobile sync
```

#### Orders
```
GET    /api/desktop/orders                  # List all orders
POST   /api/desktop/orders                  # Create order
GET    /api/desktop/orders/:id              # Get order details
PUT    /api/desktop/orders/:id/approve      # Approve order
PUT    /api/desktop/orders/:id/reject       # Reject order
```

#### Mobile Sync
```
POST   /api/mobile/sync/initial             # Initial data sync
POST   /api/mobile/sync/incremental         # Incremental sync
POST   /api/mobile/sync/upload              # Upload offline orders
```

For complete API documentation, see [API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md)

---

## 🔒 Security

### Security Features

- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Password Hashing** - bcrypt with salt rounds
- ✅ **Rate Limiting** - Prevents brute force attacks
- ✅ **SQL Injection Protection** - Parameterized queries
- ✅ **CORS Configuration** - Controlled access
- ✅ **Environment Variables** - Sensitive data protection

### Security Best Practices

1. **Environment Variables:**
   - Never commit `.env` files
   - Use strong, unique passwords
   - Rotate JWT secrets regularly

2. **Database Security:**
   - Use strong database passwords
   - Limit remote access with firewall rules
   - Regular backups
   - Enable SSL/TLS for connections

3. **API Security:**
   - Always use HTTPS in production
   - Implement rate limiting
   - Monitor for suspicious activity
   - Keep dependencies updated

4. **Application Security:**
   - Change default credentials immediately
   - Use role-based access control
   - Regular security audits
   - Keep all software updated

### Reporting Security Issues

Please report security vulnerabilities to: **security@ummahtechinnovations.com**

See [SECURITY.md](SECURITY.md) for our security policy.

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on:

- Code of Conduct
- Development workflow
- Commit message conventions
- Pull request process
- Testing requirements

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

### Documentation

- [Installation Guide](INSTALLATION_GUIDE.md)
- [Deployment Guide](DEPLOYMENT_GUIDE_CENTRAL_SERVER.md)
- [Invoice System Analysis](INVOICE_SYSTEM_ANALYSIS_COMPLETE.md)
- [Mobile Build Guide](mobile/APK_BUILD_GUIDE.md)
- [Professional Deployment Plan](PROFESSIONAL_DEPLOYMENT_PLAN.md)
- [Localhost Testing Guide](LOCALHOST_TESTING_GUIDE.md)

### Getting Help

- **Issues:** [GitHub Issues](https://github.com/ADNANKHALID4356/distribution_system/issues)
- **Email:** contact@ummahtechinnovations.com
- **Website:** https://ummahtechinnovations.com

### Troubleshooting

#### Backend Won't Start
- Check MySQL is running: `sudo systemctl status mysql`
- Verify database credentials in `.env`
- Check port 5000 is not in use: `netstat -an | findstr :5000`

#### Desktop App Can't Connect
- Verify backend is running
- Check server configuration (Settings icon)
- Ensure firewall allows port 5000
- Test API: `curl http://localhost:5000/api/health`

#### Mobile App Issues
- Check API URL in `mobile/src/services/api.js`
- Verify network connectivity
- Check server is accessible from mobile device
- Review Expo logs: `expo start --clear`

---

## 🎉 Acknowledgments

- Built with ❤️ by **Ummahtechinnovations**
- Powered by Node.js, React, and Expo
- Icons by Heroicons and Lucide
- UI components by Material-UI and React Native Paper

---

## 📊 Project Status

- ✅ **Backend API:** Production Ready
- ✅ **Desktop App:** Production Ready
- ✅ **Mobile App:** Production Ready
- ✅ **Invoice System:** Fully Functional (SQLite/MySQL compatible)
- ✅ **Documentation:** Complete
- ✅ **Testing:** All Core Features Tested

**Current Version:** 1.0.0  
**Last Updated:** January 24, 2026

---

## Recently Completed (v1.0.0) ✅
- ✅ Complete SQLite/MySQL database compatibility layer
- ✅ Invoice system with automatic ledger integration
- ✅ Professional invoice generation and numbering
- ✅ Shop balance tracking and payment history
- ✅ Comprehensive test suite for invoice functionality

### Planned Features (v1.1)
- [ ] Multi-language support (English, Urdu)
- [ ] Advanced analytics dashboard
- [ ] Export to Excel/CSV
- [ ] Email notifications
- [ ] SMS integration for orders
- [ ] Automated invoice email delivery

### Future Enhancements (v2.0)
- [ ] iOS mobile app
- [ ] Web-based admin portal
- [ ] Real-time chat between admin and salesmen
- [ ] GPS tracking for deliveries
- [ ] Integration with accounting software
- [ ] Barcode/QR code scanning for inventoryesmen
- [ ] GPS tracking for deliveries
- [ ] Integration with accounting software

---

<div align="center">

**[⬆ Back to Top](#-distribution-management-system)**

Made with ❤️ by Ummahtechinnovations

</div>
#   d i s t r i b u t i o n T e s t i n g  
 