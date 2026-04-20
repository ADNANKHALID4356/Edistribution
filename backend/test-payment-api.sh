#!/bin/bash
# Test Payment API

# Login and get token
echo '{"username":"admin","password":"admin123"}' > /tmp/login.json
RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/login -H 'Content-Type: application/json' -d @/tmp/login.json)
echo "Login Response: $RESPONSE"

TOKEN=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])")
echo "Token: $TOKEN"

# Test receive payment from shop 3
echo '{"shop_id": 3, "amount": 50, "payment_method": "cash", "transaction_type": "receive"}' > /tmp/payment.json
echo ""
echo "Testing RECEIVE payment (shop pays us)..."
PAYMENT_RESPONSE=$(curl -s -X POST http://localhost:5001/api/desktop/ledger/payment -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" -d @/tmp/payment.json)
echo "Payment Response: $PAYMENT_RESPONSE"

# Check ledger
echo ""
echo "Checking ledger after payment..."
mysql -u root -pAhmednafees1214! distribution_db -e 'SELECT id, shop_id, transaction_type, debit_amount, credit_amount, balance, description FROM shop_ledger ORDER BY id'

# Check shop balance
echo ""
echo "Checking shop 3 balance..."
mysql -u root -pAhmednafees1214! distribution_db -e 'SELECT id, shop_name, current_balance FROM shops WHERE id = 3'
