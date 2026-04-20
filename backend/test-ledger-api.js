/**
 * Test Ledger API Endpoints
 * Quick test script to verify API responses
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/desktop';

// You'll need a valid token - let's get one first
async function login() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    return response.data.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testLedgerAPI() {
  console.log('🧪 TESTING LEDGER API ENDPOINTS\n');
  console.log('='.repeat(60));
  
  try {
    // Get auth token
    console.log('1️⃣  Logging in...');
    const token = await login();
    console.log('✅ Login successful\n');
    
    const config = {
      headers: { 'Authorization': `Bearer ${token}` }
    };
    
    // Test 1: Get shop ledger
    console.log('2️⃣  Testing: GET /ledger/shop/3');
    try {
      const response = await axios.get(`${API_BASE}/ledger/shop/3?page=1&limit=20`, config);
      console.log('✅ Status:', response.status);
      console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('❌ Error:', error.response?.data || error.message);
    }
    
    console.log('\n' + '-'.repeat(60) + '\n');
    
    // Test 2: Get balance summary
    console.log('3️⃣  Testing: GET /ledger/balance');
    try {
      const response = await axios.get(`${API_BASE}/ledger/balance`, config);
      console.log('✅ Status:', response.status);
      console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('❌ Error:', error.response?.data || error.message);
    }
    
    console.log('\n' + '-'.repeat(60) + '\n');
    
    // Test 3: Get shop balance
    console.log('4️⃣  Testing: GET /ledger/balance/3');
    try {
      const response = await axios.get(`${API_BASE}/ledger/balance/3`, config);
      console.log('✅ Status:', response.status);
      console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('❌ Error:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ API Testing complete!\n');
}

testLedgerAPI();
