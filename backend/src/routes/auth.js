const express = require('express');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/nodemailer');

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Sign Up
router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password, referralCode } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }
    
    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ referralCode });
    }
    
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    const user = await User.create({
      name,
      email,
      password,
      verificationToken,
      verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000,
      referredBy: referrer?._id
    });
    
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
    
    if (user.isLocked()) {
      const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked due to too many failed login attempts. Please try again in ${lockTimeRemaining} minutes.`
      });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    await user.resetLoginAttempts();
    
    // Auto-promote admin based on environment variable
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && user.email.toLowerCase() === adminEmail.toLowerCase() && user.role !== 'admin') {
      user.role = 'admin';
      user.isVerified = true;
      user.kycStatus = 'approved';
      await user.save();
      console.log(`Auto-promoted ${user.email} to admin role`);
    }
    
    // Check if 2FA is enabled
    if (user.is2FAEnabled) {
      // Store userId in session temporarily for 2FA verification
      req.session.pending2FAUserId = user._id.toString();
      return res.json({
        success: true,
        requires2FA: true
      });
    }
    
    // Set session
    req.session.userId = user._id.toString();
    
    // Save session and return sessionId for cross-origin fallback
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
      }
      res.json({
        success: true,
        isAdmin: user.role === 'admin',
        sessionId: req.sessionID,
        data: {
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
    });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Check session (replaces token validation)
router.get('/session', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.json({ success: false, message: 'No active session' });
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.json({ success: false, message: 'User not found' });
    }

    const activeSessionId = req.sessionSourceId || req.sessionID;

    res.json({
      success: true,
      sessionId: activeSessionId,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        is2FAEnabled: user.is2FAEnabled,
        kycStatus: user.kycStatus,
        balance: user.balance,
        referralCode: user.referralCode,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.json({ success: false, message: 'Session check failed' });
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
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.'
      });
    }
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000;
    await user.save();
    
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
    
    req.user.twoFactorSecret = secret.base32;
    await req.user.save();
    
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
router.post('/2fa/verify', async (req, res, next) => {
  try {
    const { code } = req.body;
    
    // If user is already authenticated (enabling 2FA), use session userId
    // If pending 2FA login, use pending2FAUserId
    const userId = req.session?.userId || req.session?.pending2FAUserId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'No pending 2FA verification'
      });
    }
    
    const user = await User.findById(userId).select('+twoFactorSecret');
    
    if (!user || !user.twoFactorSecret) {
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
    
    // If this was a login 2FA verification, set and persist the real session
    if (req.session.pending2FAUserId) {
      req.session.userId = req.session.pending2FAUserId;
      delete req.session.pending2FAUserId;

      return req.session.save((err) => {
        if (err) return next(err);
        res.json({
          success: true,
          sessionId: req.sessionID,
          message: '2FA verified successfully',
          data: {
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
      });
    }

    res.json({
      success: true,
      sessionId: req.sessionID,
      message: '2FA verified successfully',
      data: {
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
