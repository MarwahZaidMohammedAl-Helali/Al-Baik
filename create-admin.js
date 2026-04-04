// Script to create admin user
// Run this with: node create-admin.js

const API_BASE = 'https://al-baik-api.albaik-ecommerce-api.workers.dev/api';

async function createAndTestAdmin() {
  try {
    console.log('🔄 Creating admin user...');
    
    const createResponse = await fetch(`${API_BASE}/admin/create-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const createData = await createResponse.json();
    
    if (createResponse.ok) {
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin');
      console.log('🔑 Password: 1234');
      
      // Now test login
      console.log('🔄 Testing admin login...');
      
      const loginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin',
          password: '1234'
        })
      });

      const loginData = await loginResponse.json();
      
      if (loginResponse.ok) {
        console.log('✅ Admin login successful!');
        console.log('👤 Role:', loginData.user?.role);
        console.log('🎯 Token:', loginData.token ? 'Generated' : 'Missing');
      } else {
        console.log('❌ Login failed:', loginData.error);
      }
    } else {
      console.log('❌ Failed to create admin user:', createData.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createAndTestAdmin();