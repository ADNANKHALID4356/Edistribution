# 📡 API Documentation - Distribution Management System

Complete REST API documentation for the Distribution Management System backend.

**Base URL:** `https://your-domain.com/api` or `http://your-server-ip:5000/api`

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Products](#products)
3. [Shops](#shops)
4. [Routes](#routes)
5. [Orders](#orders)
6. [Invoices](#invoices)
7. [Users](#users)
8. [Dashboard](#dashboard)
9. [Error Codes](#error-codes)

---

## 🔐 Authentication

### Login

**Endpoint:** `POST /auth/login`

**Description:** Authenticate user and receive JWT token

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (Success 200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "admin",
    "full_name": "Administrator",
    "role": "admin",
    "email": "admin@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Error 401):**
```json
{
  "error": "Invalid credentials"
}
```

### Logout

**Endpoint:** `POST /auth/logout`

**Description:** Logout user and invalidate session

**Headers:**
```
Authorization: Bearer <token>
```

**Response (Success 200):**
```json
{
  "message": "Logged out successfully"
}
```

### Get Profile

**Endpoint:** `GET /auth/profile`

**Description:** Get current user profile

**Headers:**
```
Authorization: Bearer <token>
```

**Response (Success 200):**
```json
{
  "id": 1,
  "username": "admin",
  "full_name": "Administrator",
  "role": "admin",
  "email": "admin@example.com",
  "phone": "+1234567890"
}
```

---

## 📦 Products

### Get All Products

**Endpoint:** `GET /desktop/products`

**Description:** Retrieve all products with pagination and filtering

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `search` (optional): Search by product name or code
- `category_id` (optional): Filter by category
- `is_active` (optional): Filter by active status (1 or 0)

**Example:** `GET /desktop/products?page=1&limit=20&search=soap&is_active=1`

**Response (Success 200):**
```json
{
  "products": [
    {
      "id": 1,
      "product_code": "PRD001",
      "product_name": "Lux Soap",
      "category_id": 1,
      "category_name": "Soaps",
      "brand_id": 1,
      "brand_name": "Lux",
      "unit": "piece",
      "price": 45.00,
      "cost": 35.00,
      "stock": 1000,
      "is_active": 1,
      "created_at": "2026-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

### Get Single Product

**Endpoint:** `GET /desktop/products/:id`

**Description:** Retrieve single product details

**Headers:**
```
Authorization: Bearer <token>
```

**Response (Success 200):**
```json
{
  "id": 1,
  "product_code": "PRD001",
  "product_name": "Lux Soap",
  "category_id": 1,
  "category_name": "Soaps",
  "brand_id": 1,
  "brand_name": "Lux",
  "unit": "piece",
  "price": 45.00,
  "cost": 35.00,
  "stock": 1000,
  "description": "Premium soap with moisturizing formula",
  "barcode": "1234567890123",
  "is_active": 1,
  "created_at": "2026-01-15T10:30:00.000Z",
  "updated_at": "2026-01-15T10:30:00.000Z"
}
```

### Create Product

**Endpoint:** `POST /desktop/products`

**Description:** Create a new product

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "product_code": "PRD002",
  "product_name": "Dove Soap",
  "category_id": 1,
  "brand_id": 2,
  "unit": "piece",
  "price": 55.00,
  "cost": 42.00,
  "stock": 500,
  "description": "Moisturizing beauty bar",
  "barcode": "1234567890124",
  "is_active": 1
}
```

**Response (Success 201):**
```json
{
  "message": "Product created successfully",
  "id": 2
}
```

**Response (Error 400):**
```json
{
  "error": "Product code already exists"
}
```

### Update Product

**Endpoint:** `PUT /desktop/products/:id`

**Description:** Update existing product

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:** (same as create, all fields optional)
```json
{
  "price": 60.00,
  "stock": 450
}
```

**Response (Success 200):**
```json
{
  "message": "Product updated successfully"
}
```

### Delete Product

**Endpoint:** `DELETE /desktop/products/:id`

**Description:** Delete a product (soft delete, sets is_active to 0)

**Headers:**
```
Authorization: Bearer <token>
```

**Response (Success 200):**
```json
{
  "message": "Product deleted successfully"
}
```

---

## 🏪 Shops

### Get All Shops

**Endpoint:** `GET /desktop/shops`

**Description:** Retrieve all shops/customers

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `search` (optional): Search by shop name or code
- `route_id` (optional): Filter by route
- `is_active` (optional): Filter by status

**Response (Success 200):**
```json
{
  "shops": [
    {
      "id": 1,
      "shop_code": "SHP001",
      "shop_name": "Al-Madina Store",
      "owner_name": "Muhammad Ali",
      "address": "Main Street, Block A",
      "city": "Lahore",
      "area": "Gulberg",
      "phone": "+92300-1234567",
      "route_id": 1,
      "route_name": "Route A",
      "credit_limit": 50000.00,
      "current_balance": 12000.00,
      "is_active": 1,
      "created_at": "2026-01-10T08:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 85,
    "page": 1,
    "limit": 50,
    "pages": 2
  }
}
```

### Create Shop

**Endpoint:** `POST /desktop/shops`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "shop_code": "SHP002",
  "shop_name": "City Mart",
  "owner_name": "Ahmed Hassan",
  "address": "Commercial Area",
  "city": "Karachi",
  "area": "Clifton",
  "phone": "+92321-9876543",
  "email": "citymart@example.com",
  "route_id": 2,
  "credit_limit": 75000.00,
  "opening_balance": 5000.00,
  "is_active": 1
}
```

**Response (Success 201):**
```json
{
  "message": "Shop created successfully",
  "id": 2
}
```

### Update Shop

**Endpoint:** `PUT /desktop/shops/:id`

**Request Body:** (partial updates allowed)
```json
{
  "phone": "+92321-9876544",
  "credit_limit": 100000.00
}
```

**Response (Success 200):**
```json
{
  "message": "Shop updated successfully"
}
```

### Delete Shop

**Endpoint:** `DELETE /desktop/shops/:id`

**Response (Success 200):**
```json
{
  "message": "Shop deleted successfully"
}
```

---

## 🗺️ Routes

### Get All Routes

**Endpoint:** `GET /desktop/routes`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (Success 200):**
```json
{
  "routes": [
    {
      "id": 1,
      "route_code": "RT001",
      "route_name": "Route A - Gulberg",
      "area": "Gulberg",
      "city": "Lahore",
      "description": "Covers main commercial area",
      "shop_count": 25,
      "is_active": 1,
      "created_at": "2026-01-05T09:00:00.000Z"
    }
  ]
}
```

### Create Route

**Endpoint:** `POST /desktop/routes`

**Request Body:**
```json
{
  "route_code": "RT003",
  "route_name": "Route C - DHA",
  "area": "DHA Phase 5",
  "city": "Lahore",
  "description": "Residential and commercial area",
  "is_active": 1
}
```

**Response (Success 201):**
```json
{
  "message": "Route created successfully",
  "id": 3
}
```

### Update Route

**Endpoint:** `PUT /desktop/routes/:id`

**Request Body:**
```json
{
  "route_name": "Route C - DHA Extended",
  "description": "Extended to include Phase 6"
}
```

**Response (Success 200):**
```json
{
  "message": "Route updated successfully"
}
```

---

## 📝 Orders

### Get All Orders

**Endpoint:** `GET /desktop/orders`

**Query Parameters:**
- `status`: Filter by status (pending, confirmed, delivered, cancelled)
- `shop_id`: Filter by shop
- `salesman_id`: Filter by salesman
- `from_date`: Start date (YYYY-MM-DD)
- `to_date`: End date (YYYY-MM-DD)

**Response (Success 200):**
```json
{
  "orders": [
    {
      "id": 1,
      "order_no": "ORD-20260115-001",
      "shop_id": 1,
      "shop_name": "Al-Madina Store",
      "salesman_id": 5,
      "salesman_name": "Hassan Ali",
      "order_date": "2026-01-15",
      "delivery_date": "2026-01-16",
      "total_amount": 15500.00,
      "discount": 500.00,
      "net_amount": 15000.00,
      "status": "confirmed",
      "items_count": 8,
      "created_at": "2026-01-15T14:30:00.000Z"
    }
  ],
  "summary": {
    "total_orders": 150,
    "total_amount": 450000.00,
    "pending": 25,
    "confirmed": 100,
    "delivered": 20,
    "cancelled": 5
  }
}
```

### Get Single Order

**Endpoint:** `GET /desktop/orders/:id`

**Response (Success 200):**
```json
{
  "id": 1,
  "order_no": "ORD-20260115-001",
  "shop_id": 1,
  "shop_name": "Al-Madina Store",
  "salesman_id": 5,
  "salesman_name": "Hassan Ali",
  "order_date": "2026-01-15",
  "delivery_date": "2026-01-16",
  "status": "confirmed",
  "notes": "Urgent delivery required",
  "items": [
    {
      "id": 1,
      "product_id": 1,
      "product_code": "PRD001",
      "product_name": "Lux Soap",
      "quantity": 50,
      "price": 45.00,
      "discount": 0,
      "amount": 2250.00
    },
    {
      "id": 2,
      "product_id": 2,
      "product_code": "PRD002",
      "product_name": "Dove Soap",
      "quantity": 40,
      "price": 55.00,
      "discount": 100,
      "amount": 2100.00
    }
  ],
  "total_amount": 15500.00,
  "discount": 500.00,
  "net_amount": 15000.00
}
```

### Create Order

**Endpoint:** `POST /desktop/orders`

**Request Body:**
```json
{
  "shop_id": 1,
  "salesman_id": 5,
  "order_date": "2026-01-15",
  "delivery_date": "2026-01-16",
  "notes": "Urgent delivery",
  "items": [
    {
      "product_id": 1,
      "quantity": 50,
      "price": 45.00,
      "discount": 0
    },
    {
      "product_id": 2,
      "quantity": 40,
      "price": 55.00,
      "discount": 100
    }
  ]
}
```

**Response (Success 201):**
```json
{
  "message": "Order created successfully",
  "order_id": 1,
  "order_no": "ORD-20260115-001"
}
```

### Update Order Status

**Endpoint:** `PUT /desktop/orders/:id/status`

**Request Body:**
```json
{
  "status": "delivered",
  "notes": "Delivered successfully"
}
```

**Response (Success 200):**
```json
{
  "message": "Order status updated successfully"
}
```

---

## 📄 Invoices

### Get All Invoices

**Endpoint:** `GET /desktop/invoices`

**Query Parameters:**
- `shop_id`: Filter by shop
- `status`: Filter by status (unpaid, partial, paid)
- `from_date`: Start date
- `to_date`: End date

**Response (Success 200):**
```json
{
  "invoices": [
    {
      "id": 1,
      "invoice_no": "INV-20260115-001",
      "order_id": 1,
      "order_no": "ORD-20260115-001",
      "shop_id": 1,
      "shop_name": "Al-Madina Store",
      "invoice_date": "2026-01-15",
      "due_date": "2026-01-30",
      "total_amount": 15000.00,
      "paid_amount": 0.00,
      "balance": 15000.00,
      "status": "unpaid",
      "created_at": "2026-01-15T15:00:00.000Z"
    }
  ]
}
```

### Get Single Invoice

**Endpoint:** `GET /desktop/invoices/:id`

**Response:** (Includes full details with items and payment history)

### Create Invoice

**Endpoint:** `POST /desktop/invoices`

**Request Body:**
```json
{
  "order_id": 1,
  "invoice_date": "2026-01-15",
  "due_date": "2026-01-30",
  "notes": "Payment terms: 15 days"
}
```

**Response (Success 201):**
```json
{
  "message": "Invoice created successfully",
  "invoice_id": 1,
  "invoice_no": "INV-20260115-001"
}
```

---

## 👥 Users

### Get All Users

**Endpoint:** `GET /desktop/users`

**Roles:** Admin only

**Response (Success 200):**
```json
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "full_name": "Administrator",
      "role": "admin",
      "email": "admin@example.com",
      "phone": "+1234567890",
      "is_active": 1
    }
  ]
}
```

### Create User

**Endpoint:** `POST /desktop/users`

**Roles:** Admin only

**Request Body:**
```json
{
  "username": "salesman1",
  "password": "SecurePass123!",
  "full_name": "Hassan Ali",
  "role": "salesman",
  "email": "hassan@example.com",
  "phone": "+92300-1234567",
  "is_active": 1
}
```

**Response (Success 201):**
```json
{
  "message": "User created successfully",
  "id": 5
}
```

---

## 📊 Dashboard

### Get Dashboard Stats

**Endpoint:** `GET /desktop/dashboard/stats`

**Response (Success 200):**
```json
{
  "today": {
    "orders": 45,
    "sales": 125000.00,
    "deliveries": 38
  },
  "month": {
    "orders": 1250,
    "sales": 3750000.00,
    "target": 5000000.00,
    "achievement": 75.00
  },
  "inventory": {
    "total_products": 150,
    "low_stock": 12,
    "out_of_stock": 3
  },
  "customers": {
    "total": 85,
    "active": 78,
    "inactive": 7
  }
}
```

---

## ❌ Error Codes

### HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Authentication required or failed
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Duplicate entry (e.g., code already exists)
- **500 Internal Server Error**: Server error

### Error Response Format

```json
{
  "error": "Error message description",
  "details": "Additional error details (optional)"
}
```

### Common Error Messages

- `"Invalid credentials"` - Wrong username or password
- `"Token expired"` - JWT token has expired, login again
- `"Unauthorized access"` - No permission for this resource
- `"Product code already exists"` - Duplicate product code
- `"Shop not found"` - Invalid shop ID
- `"Insufficient stock"` - Not enough inventory
- `"Invalid date format"` - Use YYYY-MM-DD format

---

## 🔑 Authentication

All endpoints except `/auth/login` require JWT authentication.

**Include token in header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token expires in:** 7 days (configurable via JWT_EXPIRE)

**On token expiration:** Re-authenticate via `/auth/login`

---

## 📝 Notes

1. **Pagination**: Default is 50 items per page, maximum 100
2. **Date Format**: Use ISO 8601 format (YYYY-MM-DD)
3. **Decimal Places**: Currency values use 2 decimal places
4. **Timestamps**: All timestamps are in UTC
5. **Soft Deletes**: Most delete operations set `is_active=0`

---

## 🧪 Testing with cURL

### Login Example
```bash
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Get Products Example
```bash
curl -X GET https://your-domain.com/api/desktop/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Product Example
```bash
curl -X POST https://your-domain.com/api/desktop/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "product_code":"PRD003",
    "product_name":"Lifebuoy Soap",
    "category_id":1,
    "brand_id":3,
    "unit":"piece",
    "price":40.00,
    "cost":30.00,
    "stock":800,
    "is_active":1
  }'
```

---

## 📞 Support

For API support and questions:

- **Email**: info@ummahtechinnovations.com
- **Documentation**: See DEPLOYMENT_GUIDE_PRODUCTION.md
- **Issues**: Report via GitHub Issues

---

**Version:** 1.0  
**Last Updated:** January 2026  
**Prepared by:** Ummahtechinnovations
