const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/greenbull';

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
  referralCode: String,
}, { timestamps: true });

async function seedAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', userSchema);

    // Hash the password properly
    const adminPassword = 'Admin@123456';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const existingAdmin = await User.findOne({ email: 'admin@greenbull.com' });

    if (existingAdmin) {
      // Update existing user to be admin with hashed password
      await User.updateOne(
        { email: 'admin@greenbull.com' },
        {
          $set: {
            password: hashedPassword,
            role: 'admin',
            isVerified: true,
            kycStatus: 'approved'
          }
        }
      );

      console.log('✅ Admin account updated successfully!');
      console.log('Email: admin@greenbull.com');
      console.log('Password: Admin@123456');
      console.log('Role: admin');
      process.exit(0);
    }

    // Generate referral code
    const referralCode = 'ADM' + Date.now().toString(36).toUpperCase();

    // Create new admin user
    await User.create({
      name: 'Admin',
      email: 'admin@greenbull.com',
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
      kycStatus: 'approved',
      referralCode: referralCode
    });

    console.log('✅ Admin account created successfully!');
    console.log('Email: admin@greenbull.com');
    console.log('Password: Admin@123456');
    console.log('Role: admin');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedAdmin();
