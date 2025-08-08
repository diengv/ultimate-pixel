const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:3000/api/shopify';

// Mock Shopify auth data
function createMockAuthData(shop = 'test-shop.myshopify.com') {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const host = Buffer.from(`${shop}/admin`).toString('base64');
  
  // Create HMAC (this would normally be provided by Shopify)
  const queryParams = new URLSearchParams();
  queryParams.append('host', host);
  queryParams.append('shop', shop);
  queryParams.append('timestamp', timestamp);
  queryParams.sort();
  
  // Using a test client secret - in real app this would be from env
  const hmac = crypto
    .createHmac('sha256', 'test_client_secret')
    .update(queryParams.toString())
    .digest('hex');
  
  return {
    hmac,
    host,
    shop,
    timestamp,
    code: 'test_auth_code',
    state: 'test_state',
    scope: 'read_products'
  };
}

async function testImplementation() {
  try {
    console.log('🚀 Testing Shopify authentication implementation...\n');
    
    // Step 1: Test installation endpoint
    console.log('1️⃣  Testing POST /installation...');
    const authData = createMockAuthData();
    
    const installResponse = await axios.post(`${BASE_URL}/installation`, authData);
    console.log('✅ Installation successful');
    console.log('📦 Response:', {
      shop_code: installResponse.data.data.shop_code,
      shop: installResponse.data.data.shop,
      status: installResponse.data.data.status,
      has_token: !!installResponse.data.data.installation_token
    });
    
    const { shop_code, installation_token } = installResponse.data.data;
    
    // Step 2: Test authorize endpoint with valid token
    console.log('\n2️⃣  Testing POST /authorize with VALID token...');
    
    const authorizeResponse = await axios.post(`${BASE_URL}/authorize`, authData, {
      headers: {
        'x-shop-code': shop_code,
        'Authorization': `Bearer ${installation_token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Authorization successful with valid token');
    
    // Step 3: Test authorize endpoint with invalid token
    console.log('\n3️⃣  Testing POST /authorize with INVALID token...');
    
    try {
      await axios.post(`${BASE_URL}/authorize`, authData, {
        headers: {
          'x-shop-code': shop_code,
          'Authorization': `Bearer invalid_token_12345`,
          'Content-Type': 'application/json'
        }
      });
      console.log('❌ ERROR: Should have been rejected with invalid token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected invalid token');
        console.log('📝 Error message:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }
    
    // Step 4: Test authorize endpoint without x-shop-code header
    console.log('\n4️⃣  Testing POST /authorize without x-shop-code header...');
    
    try {
      await axios.post(`${BASE_URL}/authorize`, authData, {
        headers: {
          'Authorization': `Bearer ${installation_token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('❌ ERROR: Should have been rejected without x-shop-code');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected missing x-shop-code header');
        console.log('📝 Error message:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the backend server is running on port 3000');
    }
  }
}

// Run tests
testImplementation();