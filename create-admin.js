// Script to create admin account for testing
const axios = require('axios');

const API_URL = 'https://al-baik-api.albaik-ecommerce-api.workers.dev/api';

async function createAdmin() {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@albaik.com',
      password: 'admin123',
      role: 'admin'
    });
    
    console.log('Admin account created successfully:');
    console.log('Email: admin@albaik.com');
    console.log('Password: admin123');
    console.log('Token:', response.data.token);
  } catch (error) {
    console.error('Error creating admin:', error.response?.data || error.message);
  }
}

createAdmin();