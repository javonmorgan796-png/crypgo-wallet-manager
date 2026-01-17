/**
 * Promote User to Admin Script
 * 
 * Usage: node src/scripts/promoteToAdmin.js <email>
 * Example: node src/scripts/promoteToAdmin.js admin@greenbull.com
 * 
 * This script promotes an existing user to admin role.
 */

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
}, { timestamps: true });

async function promoteToAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.log('❌ Please provide an email address');
    console.log('Usage: node src/scripts/promoteToAdmin.js <email>');
    console.log('Example: node src/scripts/promoteToAdmin.js admin@greenbull.com');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', userSchema);

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`❌ User not found with email: ${email}`);
      process.exit(1);
    }

    if (user.role === 'admin') {
      console.log(`ℹ️ User ${email} is already an admin`);
      process.exit(0);
    }

    // Promote to admin
    await User.updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          role: 'admin',
          isVerified: true,
          kycStatus: 'approved'
        }
      }
    );

    console.log(`✅ Successfully promoted ${email} to admin!`);
    console.log('User can now access the admin dashboard at /admin');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

promoteToAdmin();
