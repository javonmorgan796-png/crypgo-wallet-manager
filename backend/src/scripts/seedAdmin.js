const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenbull';

async function seedAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@greenbull.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      console.log('Email: admin@greenbull.com');
      console.log('If you forgot the password, delete the user and run this script again');
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@greenbull.com',
      password: 'Admin@123456',
      role: 'admin',
      isVerified: true,
      kycStatus: 'approved',
      balance: 0
    });

    console.log('Admin user created successfully!');
    console.log('=================================');
    console.log('Email: admin@greenbull.com');
    console.log('Password: Admin@123456');
    console.log('=================================');
    console.log('IMPORTANT: Change this password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
