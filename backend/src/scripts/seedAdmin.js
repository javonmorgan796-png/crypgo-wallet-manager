const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenbull';

// Define User schema inline to avoid import issues
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'user' },
  isVerified: { type: Boolean, default: false },
  kycStatus: { type: String, default: 'none' },
  balance: { type: Number, default: 0 },
  totalProfit: { type: Number, default: 0 },
  totalInvested: { type: Number, default: 0 },
}, { timestamps: true });

async function seedAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', userSchema);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@greenbull.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists - updating to ensure admin role');
      await User.updateOne(
        { email: 'admin@greenbull.com' },
        { 
          $set: { 
            role: 'admin',
            isVerified: true,
            kycStatus: 'approved'
          }
        }
      );
      console.log('Admin user updated!');
      console.log('Email: admin@greenbull.com');
      console.log('Use your existing password to login');
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('Admin@123456', 10);

    // Create admin user
    await User.create({
      name: 'Admin',
      email: 'admin@greenbull.com',
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
      kycStatus: 'approved',
      balance: 0,
      totalProfit: 0,
      totalInvested: 0
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
