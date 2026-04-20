# Test Order Sync - Manual API Call

Test script to verify backend order creation endpoint works correctly.

```bash
curl -X POST http://localhost:5000/api/shared/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
  "salesman_id": 4,
  "shop_id": 3,
  "route_id": null,
  "order_date": "2026-01-26T12:00:00.000Z",
  "status": "placed",
  "subtotal": 540,
  "discount_amount": 0,
  "discount_percentage": 0,
  "tax_amount": 0,
  "total_amount": 540,
  "notes": "Test order from API",
  "items": [
    {
      "product_id": 10,
      "quantity": 1,
      "unit_price": 45,
      "total_price": 45,
      "discount_amount": 0
    },
    {
      "product_id": 12,
      "quantity": 1,
      "unit_price": 25,
      "total_price": 25,
      "discount_amount": 0
    }
  ]
}'
```

Replace YOUR_TOKEN_HERE with actual token from mobile app or login.
