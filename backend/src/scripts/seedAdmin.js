const mongoose = require('mongoose');
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
}, { timestamps: true });

async function seedAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', userSchema);

    const existingAdmin = await User.findOne({ email: 'admin@greenbull.com' });

    if (existingAdmin) {
      await User.updateOne(
        { email: 'admin@greenbull.com' },
        {
          $set: {
            password: 'admin123', // 👈 PLAIN TEXT
            role: 'admin',
            isVerified: true,
            kycStatus: 'approved'
          }
        }
      );

      console.log('Admin password updated (plain text)');
      console.log('Email: admin@greenbull.com');
      console.log('Password: admin123');
      process.exit(0);
    }

    await User.create({
      name: 'Admin',
      email: 'admin@greenbull.com',
      password: 'admin123', // 👈 PLAIN TEXT
      role: 'admin',
      isVerified: true,
      kycStatus: 'approved'
    });

    console.log('Admin created');
    console.log('Email: admin@greenbull.com');
    console.log('Password: admin123');

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seedAdmin();
