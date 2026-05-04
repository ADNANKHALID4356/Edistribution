# Enterprise Distribution Management System

A full-stack distribution operations platform with a desktop application, backend API, and mobile client support.

## Overview

This repository contains:

- `backend`: Node.js/Express API with MySQL (production) and SQLite (development) support.
- `desktop`: Electron + React desktop client for admin, operations, accounting, stock, and delivery workflows.
- `mobile`: field-sales mobile app module.

The system supports products, stock, warehouses, suppliers, shops, orders, deliveries, ledgers, invoicing, and role-based access control (RBAC).

## Key Features

- Role-based access control for `Admin`, `Senior Manager`, `Manager`, `Accountant`, `Stock Manager`, and `Salesman`.
- Product management with CSV/Excel/PDF bulk import and upsert.
- Cascading product filters (Category, Brand, Company, Stock Level, Status).
- Dashboard metrics with role-aware financial visibility.
- Delivery and stock return flows with stock movement tracking.
- User management (role-scoped create/update/status/password/reset/delete).
- SQLite-first development support with startup auto-migrations.

## Architecture

- **Backend**: REST API, JWT auth, authorization middleware, migration bootstrap.
- **Desktop**: Electron shell, React UI, protected routes, role-aware modules.
- **Database**:
  - Production: MySQL schema under `backend/database`.
  - Development: SQLite file under `backend/data`, auto-migrated on startup.

## Tech Stack

- **Backend**: Node.js, Express 5, `mysql2`, `better-sqlite3`, `jsonwebtoken`, `bcryptjs`, `multer`, `xlsx`, `pdf-parse`.
- **Desktop**: Electron, React 19, React Router, MUI, TailwindCSS, Axios, jsPDF.
- **Testing**: Jest, Supertest, React test runner.

## Prerequisites

- Node.js 18+
- npm 9+
- Windows/macOS/Linux (Windows recommended for Electron packaging in this project)

## Local Development

### 1) Clone repository

```bash
git clone <your-repo-url>
cd distribution_system
```

### 2) Start backend

```bash
cd backend
npm install
npm run dev
```

Backend default URL: `http://localhost:5000`

### 3) Start desktop (React + Electron)

In a new terminal:

```bash
cd desktop
npm install
npm run electron:dev
```

This command starts:

- React dev server on `http://localhost:3000`
- Electron desktop window connected to the local frontend

## Environment Configuration

### Backend

Create `backend/.env` and set values appropriate for your environment.

Common values:

- `PORT=5000`
- `USE_SQLITE=true` (for local development)
- `JWT_SECRET=<secure-secret>`

### Desktop

Desktop API configuration is handled by runtime/server config utility. In local mode, the app is configured to use local backend endpoints.

## Default Local Admin (Development)

If no admin user exists, startup migration creates:

- Username: `admin`
- Password: `admin123`

Change credentials immediately in real environments.

## Database and Migrations

- SQLite schema and migrations run from `backend/src/config/database-sqlite.js`.
- MySQL baseline and migration SQL scripts are in:
  - `backend/database/full_mysql_schema.sql`
  - `backend/database/migrations/`

If you pull new backend changes, restart backend once to apply startup migrations.

## Build

### Desktop production build

```bash
cd desktop
npm run build
npm run electron:build
```

### Backend standalone build

```bash
cd backend
npm run build-standalone
```

## Testing

### Backend tests

```bash
cd backend
npm test
```

### Desktop tests

```bash
cd desktop
npm test
```

## Troubleshooting

- **Electron shows blank screen**
  - Ensure backend is running.
  - Ensure React dev server (`localhost:3000`) is running.
- **Port already in use**
  - Stop conflicting process or change configured port.
- **SQLite schema error**
  - Restart backend to trigger auto-migrations.
- **Desktop cannot call API**
  - Verify backend URL and local firewall/network rules.

## Security Notes

- Do not commit `.env` files.
- Rotate JWT secrets and admin credentials in non-dev environments.
- Restrict production database/network access.

## Repository Notes

- `mobile` is maintained as a submodule in this repository.
- Keep backend and desktop branches in sync when releasing RBAC/database updates.

## License

MIT License. See `LICENSE`.

## Company

- UmmahTechInnovations
- Website: [https://ummahtechinnovations.com/](https://ummahtechinnovations.com/)
