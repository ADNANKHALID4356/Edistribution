const express = require('express');
const request = require('supertest');
const { authorize, ROLES } = require('../src/middleware/auth');

const makeTestApp = () => {
  const app = express();
  app.use(express.json());

  // Inject authenticated test user from header role.
  app.use((req, _res, next) => {
    const role = req.headers['x-role'];
    req.user = role ? { id: 99, role_name: role, role: role } : null;
    next();
  });

  app.get('/orders', authorize(ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.MANAGER), (_req, res) => {
    res.json({ success: true });
  });

  app.get('/products-stock', authorize(ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.MANAGER, ROLES.STOCK_MANAGER), (_req, res) => {
    res.json({ success: true });
  });

  app.get('/warehouses', authorize(ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.MANAGER), (_req, res) => {
    res.json({ success: true });
  });

  app.post('/ledger/payment', authorize(ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.ACCOUNTANT), (_req, res) => {
    res.status(201).json({ success: true });
  });

  app.get('/ledger/aging', authorize(ROLES.ADMIN, ROLES.SENIOR_MANAGER), (_req, res) => {
    res.json({ success: true });
  });

  app.get('/users', authorize(ROLES.ADMIN, ROLES.SENIOR_MANAGER), (_req, res) => {
    res.json({ success: true });
  });

  return app;
};

describe('RBAC Integration - Route Access Matrix', () => {
  const app = makeTestApp();

  test('Admin can access all protected endpoints', async () => {
    const [orders, productsStock, warehouses, payment, aging, users] = await Promise.all([
      request(app).get('/orders').set('x-role', ROLES.ADMIN),
      request(app).get('/products-stock').set('x-role', ROLES.ADMIN),
      request(app).get('/warehouses').set('x-role', ROLES.ADMIN),
      request(app).post('/ledger/payment').set('x-role', ROLES.ADMIN),
      request(app).get('/ledger/aging').set('x-role', ROLES.ADMIN),
      request(app).get('/users').set('x-role', ROLES.ADMIN)
    ]);

    expect(orders.status).toBe(200);
    expect(productsStock.status).toBe(200);
    expect(warehouses.status).toBe(200);
    expect(payment.status).toBe(201);
    expect(aging.status).toBe(200);
    expect(users.status).toBe(200);
  });

  test('Senior Manager can access admin-equivalent business endpoints', async () => {
    const [orders, payment, users, warehouses] = await Promise.all([
      request(app).get('/orders').set('x-role', ROLES.SENIOR_MANAGER),
      request(app).post('/ledger/payment').set('x-role', ROLES.SENIOR_MANAGER),
      request(app).get('/users').set('x-role', ROLES.SENIOR_MANAGER),
      request(app).get('/warehouses').set('x-role', ROLES.SENIOR_MANAGER)
    ]);

    expect(orders.status).toBe(200);
    expect(payment.status).toBe(201);
    expect(users.status).toBe(200);
    expect(warehouses.status).toBe(200);
  });

  test('Manager can access non-financial operations, but not finance or users', async () => {
    const [orders, productsStock, warehouses, payment, aging, users] = await Promise.all([
      request(app).get('/orders').set('x-role', ROLES.MANAGER),
      request(app).get('/products-stock').set('x-role', ROLES.MANAGER),
      request(app).get('/warehouses').set('x-role', ROLES.MANAGER),
      request(app).post('/ledger/payment').set('x-role', ROLES.MANAGER),
      request(app).get('/ledger/aging').set('x-role', ROLES.MANAGER),
      request(app).get('/users').set('x-role', ROLES.MANAGER)
    ]);

    expect(orders.status).toBe(200);
    expect(productsStock.status).toBe(200);
    expect(warehouses.status).toBe(200);
    expect(payment.status).toBe(403);
    expect(aging.status).toBe(403);
    expect(users.status).toBe(403);
  });

  test('Accountant can record payments only (blocked from analytics/users/inventory)', async () => {
    const [payment, aging, users, productsStock] = await Promise.all([
      request(app).post('/ledger/payment').set('x-role', ROLES.ACCOUNTANT),
      request(app).get('/ledger/aging').set('x-role', ROLES.ACCOUNTANT),
      request(app).get('/users').set('x-role', ROLES.ACCOUNTANT),
      request(app).get('/products-stock').set('x-role', ROLES.ACCOUNTANT)
    ]);

    expect(payment.status).toBe(201);
    expect(aging.status).toBe(403);
    expect(users.status).toBe(403);
    expect(productsStock.status).toBe(403);
  });

  test('Stock Manager can access only products stock (not warehouses, finance, orders, users)', async () => {
    const [productsStock, warehouses, payment, orders, users] = await Promise.all([
      request(app).get('/products-stock').set('x-role', ROLES.STOCK_MANAGER),
      request(app).get('/warehouses').set('x-role', ROLES.STOCK_MANAGER),
      request(app).post('/ledger/payment').set('x-role', ROLES.STOCK_MANAGER),
      request(app).get('/orders').set('x-role', ROLES.STOCK_MANAGER),
      request(app).get('/users').set('x-role', ROLES.STOCK_MANAGER)
    ]);

    expect(productsStock.status).toBe(200);
    expect(warehouses.status).toBe(403);
    expect(payment.status).toBe(403);
    expect(orders.status).toBe(403);
    expect(users.status).toBe(403);
  });
});
