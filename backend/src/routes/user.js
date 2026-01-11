const express = require('express');
const User = require('../models/User');
const { protect, verifiedOnly } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/nodemailer');

const router = express.Router();

// Get user profile
router.get('/profile', protect, async (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isVerified: req.user.isVerified,
      is2FAEnabled: req.user.is2FAEnabled,
      kycStatus: req.user.kycStatus,
      balance: req.user.balance,
      referralCode: req.user.referralCode,
      avatar: req.user.avatar,
      phone: req.user.phone,
      country: req.user.country,
      notificationPreferences: req.user.notificationPreferences,
      createdAt: req.user.createdAt
    }
  });
});

// Update profile
router.put('/profile', protect, async (req, res, next) => {
  try {
    const { name, phone, country, avatar, notificationPreferences } = req.body;
    
    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (country) updates.country = country;
    if (avatar) updates.avatar = avatar;
    if (notificationPreferences) updates.notificationPreferences = notificationPreferences;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        country: user.country,
        avatar: user.avatar,
        notificationPreferences: user.notificationPreferences
      }
    });
  } catch (error) {
    next(error);
  }
});

// Change password
router.post('/change-password', protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user._id).select('+password');
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    user.password = newPassword;
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
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get referral info
router.get('/referral', protect, async (req, res, next) => {
  try {
    const referrals = await User.find({ referredBy: req.user._id })
      .select('name email createdAt')
      .sort('-createdAt');
    
    res.json({
      success: true,
      data: {
        code: req.user.referralCode,
        referrals: referrals.map(r => ({
          name: r.name,
          email: r.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mask email
          joinedAt: r.createdAt
        })),
        totalReferrals: referrals.length
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
