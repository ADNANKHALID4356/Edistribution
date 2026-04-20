import urllib.request, json

API = 'http://147.93.108.205:5001/api'

# Login
req = urllib.request.Request(
    API + '/auth/login',
    data=json.dumps({'username': 'admin', 'password': 'admin123'}).encode(),
    headers={'Content-Type': 'application/json'}
)
token = json.loads(urllib.request.urlopen(req, timeout=10).read())['data']['token']
print("Logged in")

# Get orders
req = urllib.request.Request(
    API + '/desktop/orders',
    headers={'Authorization': 'Bearer ' + token}
)
result = json.loads(urllib.request.urlopen(req, timeout=10).read())
orders = result.get('data', [])
print(f"Total orders from API: {len(orders)}")
for o in orders[:10]:
    print(f"  Order {o['id']}: {o['order_number']} | Shop: {o.get('shop_name', '?')} | Salesman: {o.get('salesman_name', '?')} | Status: {o['status']} | Amount: Rs.{o['total_amount']}")

# Check if order 19 (the mobile sync order) is visible
mobile_order = [o for o in orders if o['id'] == 19]
if mobile_order:
    print(f"\n✅ Mobile synced order (ID 19) is VISIBLE in desktop API!")
    print(f"   Details: {json.dumps(mobile_order[0], indent=2, default=str)}")
else:
    print("\n❌ Mobile synced order (ID 19) NOT found in desktop API response")
