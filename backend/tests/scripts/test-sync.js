/**
 * Debug script to test order sync endpoint directly
 */
const axios = require('axios');

async function testSync() {
  try {
    console.log('🔄 Testing order sync endpoint...\n');
    
    // First, login to get a token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'hafiz',
      password: 'hafiz123'
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.message);
      return;
    }
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('✅ Logged in as:', user.username);
    console.log('   Salesman ID:', user.salesman_id);
    console.log('   Token:', token.substring(0, 30) + '...\n');
    
    // Now test the sync endpoint
    const testOrder = {
      salesman_id: user.salesman_id || 1,
      device_info: {
        device_id: 'debug-test',
        os: 'test',
        app_version: '1.0.0'
      },
      orders: [{
        mobile_order_id: 'TEST-' + Date.now(),
        shop_id: 1,
        route_id: 1,
        order_date: new Date().toISOString(),
        total_amount: 100,
        discount: 0,
        net_amount: 100,
        notes: 'Test order from debug script',
        items: [{
          product_id: 1,
          quantity: 1,
          unit_price: 100,
          total_price: 100,
          discount: 0,
          net_price: 100
        }]
      }]
    };
    
    console.log('📤 Sending test order...');
    console.log('   Order:', JSON.stringify(testOrder.orders[0], null, 2));
    
    const syncResponse = await axios.post(
      'http://localhost:5000/api/mobile/sync/orders',
      testOrder,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\n📥 Sync Response:');
    console.log('   Success:', syncResponse.data.success);
    console.log('   Message:', syncResponse.data.message);
    console.log('   Results:', JSON.stringify(syncResponse.data.results, null, 2));
    
    if (syncResponse.data.results?.errors?.length > 0) {
      console.log('\n❌ Errors:');
      syncResponse.data.results.errors.forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.mobile_order_id}: ${e.error}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.response?.data?.results?.errors) {
      console.log('\n❌ Detailed Errors:');
      error.response.data.results.errors.forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.mobile_order_id}: ${e.error}`);
      });
    }
    process.exit(1);
  }
}

testSync();
