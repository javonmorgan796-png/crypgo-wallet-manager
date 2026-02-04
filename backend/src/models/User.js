const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationTokenExpires: Date,
  
  // Password Reset
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // 2FA
  is2FAEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  
  // KYC
  kycStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none'
  },
  kycDocuments: [{
    type: {
      type: String,
      enum: ['id_front', 'id_back', 'selfie', 'proof_of_address']
    },
    url: String,
    uploadedAt: Date
  }],
  kycRejectionReason: String,
  
  // Wallet
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative']
  },
  
  // Referral
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Profile
  avatar: String,
  phone: String,
  country: String,
  
  // Preferences
  notificationPreferences: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false }
  },
  
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Generate referral code
userSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = this.name.substring(0, 3).toUpperCase() + 
                        Date.now().toString(36).toUpperCase();
  }
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked (admins are never locked)
userSchema.methods.isLocked = function() {
  // Admin accounts bypass lock mechanism
  if (this.role === 'admin') {
    return false;
  }
  return this.lockUntil && this.lockUntil > Date.now();
};

// Increment login attempts (only for non-admin users)
userSchema.methods.incrementLoginAttempts = async function() {
  // Admin accounts don't get locked
  if (this.role === 'admin') {
    return;
  }
  
  if (this.lockUntil && this.lockUntil < Date.now()) {
    await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
    return;
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock after 10 failed attempts (increased from 5) for 30 minutes (reduced from 2 hours)
  if (this.loginAttempts + 1 >= 10) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 }; // Lock for 30 minutes
  }
  
  await this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function() {
  await this.updateOne({
    $set: { loginAttempts: 0, lastLogin: new Date() },
    $unset: { lockUntil: 1 }
  });
};

module.exports = mongoose.model('User', userSchema);
