const axios = require('axios');

async function test() {
  try {
    // Login
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginRes.data.data.token;
    
    // Test balance API
    const balanceRes = await axios.get('http://localhost:5000/api/desktop/ledger/balance?limit=3', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('\n✅ Balance API Test Results:\n');
    console.log('Success:', balanceRes.data.success);
    console.log('Data is Array:', Array.isArray(balanceRes.data.data));
    console.log('Number of shops:', balanceRes.data.data.length);
    console.log('\nPagination:', balanceRes.data.pagination);
    console.log('\nFirst shop:', balanceRes.data.data[0]);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

test();
