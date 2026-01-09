const express = require('express');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const { generateToken, protect } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/mailtrap');

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Sign Up
router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password, referralCode } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }
    
    // Check referral code
    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ referralCode });
    }
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Create user
    const user = await User.create({
      name,
      email,
      password,
      verificationToken,
      verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      referredBy: referrer?._id
    });
    
    // Send verification email
    const verificationUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const emailTemplate = emailTemplates.verification(name, verificationUrl);
    await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html
    });
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isVerified: user.isVerified
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email }).select('+password +twoFactorSecret');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked. Please try again later.'
      });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Reset login attempts on successful login
    await user.resetLoginAttempts();
    
    // Check if 2FA is enabled
    if (user.is2FAEnabled) {
      return res.json({
        success: true,
        requires2FA: true,
        tempToken: generateToken(user._id) // Short-lived token for 2FA verification
      });
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          is2FAEnabled: user.is2FAEnabled,
          kycStatus: user.kycStatus
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Verify Email
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;
    
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }
    
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();
    
    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    
    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.'
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();
    
    // Send reset email
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
    const emailTemplate = emailTemplates.passwordReset(user.name, resetUrl);
    await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html
    });
    
    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.'
    });
  } catch (error) {
    next(error);
  }
});

// Reset Password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
    
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    
    // Send confirmation email
    const emailTemplate = emailTemplates.passwordChanged(user.name);
    await sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html
    });
    
    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    next(error);
  }
});

// Enable 2FA
router.post('/2fa/enable', protect, async (req, res, next) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `GreenBull:${req.user.email}`,
      length: 20
    });
    
    // Save secret temporarily (not enabled yet)
    req.user.twoFactorSecret = secret.base32;
    await req.user.save();
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    
    res.json({
      success: true,
      data: {
        qrCode,
        secret: secret.base32
      }
    });
  } catch (error) {
    next(error);
  }
});

// Verify 2FA (during login or enabling)
router.post('/2fa/verify', protect, async (req, res, next) => {
  try {
    const { code } = req.body;
    
    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    
    if (!user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: '2FA not configured'
      });
    }
    
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1
    });
    
    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 2FA code'
      });
    }
    
    // Enable 2FA if not already enabled
    if (!user.is2FAEnabled) {
      user.is2FAEnabled = true;
      await user.save();
    }
    
    res.json({
      success: true,
      message: '2FA verified successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Disable 2FA
router.post('/2fa/disable', protect, async (req, res, next) => {
  try {
    const { code } = req.body;
    
    const user = await User.findById(req.user._id).select('+twoFactorSecret');
    
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1
    });
    
    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 2FA code'
      });
    }
    
    user.is2FAEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();
    
    res.json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
