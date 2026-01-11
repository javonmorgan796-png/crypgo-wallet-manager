const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { protect, adminOnly } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/nodemailer');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect, adminOnly);

// Dashboard stats
router.get('/dashboard/stats', async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeUsers,
      pendingKYC,
      pendingDeposits,
      pendingWithdrawals,
      deposits,
      withdrawals
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
      User.countDocuments({ kycStatus: 'pending' }),
      Transaction.countDocuments({ type: 'deposit', status: 'pending' }),
      Transaction.countDocuments({ type: 'withdrawal', status: 'pending' }),
      Transaction.aggregate([
        { $match: { type: 'deposit', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { type: 'withdrawal', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);
    
    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        pendingKYC,
        pendingDeposits,
        pendingWithdrawals,
        totalDeposits: deposits[0]?.total || 0,
        totalWithdrawals: withdrawals[0]?.total || 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get users
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role, kycStatus } = req.query;
    
    const filter = {};
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }
    if (role) filter.role = role;
    if (kycStatus) filter.kycStatus = kycStatus;
    
    const users = await User.find(filter)
      .select('-password -twoFactorSecret')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(filter);
    
    res.json({
      success: true,
      data: { users, total },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/users/:id', async (req, res, next) => {
  try {
    const { role, isVerified, balance, kycStatus } = req.body;
    
    const updates = {};
    if (role) updates.role = role;
    if (typeof isVerified === 'boolean') updates.isVerified = isVerified;
    if (typeof balance === 'number') updates.balance = balance;
    if (kycStatus) updates.kycStatus = kycStatus;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password -twoFactorSecret');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

// Get KYC requests
router.get('/kyc', async (req, res, next) => {
  try {
    const { status = 'pending' } = req.query;
    
    const users = await User.find({ kycStatus: status })
      .select('name email kycStatus kycDocuments createdAt')
      .sort('-createdAt');
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
});

// Approve KYC
router.post('/kyc/:id/approve', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { kycStatus: 'approved', kycRejectionReason: undefined },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Send notification
    await Notification.create({
      user: user._id,
      title: 'KYC Approved',
      message: 'Your KYC verification has been approved. You now have full access.',
      type: 'kyc'
    });
    
    // Send email
    const emailTemplate = emailTemplates.kycStatusUpdate(user.name, 'approved');
    await sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html
    });
    
    res.json({
      success: true,
      message: 'KYC approved successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Reject KYC
router.post('/kyc/:id/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { kycStatus: 'rejected', kycRejectionReason: reason },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Send notification
    await Notification.create({
      user: user._id,
      title: 'KYC Rejected',
      message: `Your KYC verification was rejected. Reason: ${reason}`,
      type: 'kyc'
    });
    
    // Send email
    const emailTemplate = emailTemplates.kycStatusUpdate(user.name, 'rejected', reason);
    await sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html
    });
    
    res.json({
      success: true,
      message: 'KYC rejected'
    });
  } catch (error) {
    next(error);
  }
});

// Get transactions
router.get('/transactions', async (req, res, next) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    
    const transactions = await Transaction.find(filter)
      .populate('user', 'name email')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Transaction.countDocuments(filter);
    
    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Approve transaction
router.post('/transactions/:id/approve', async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate('user');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    transaction.status = 'completed';
    transaction.processedBy = req.user._id;
    transaction.processedAt = new Date();
    await transaction.save();
    
    // Update user balance
    if (transaction.type === 'deposit') {
      await User.findByIdAndUpdate(transaction.user._id, {
        $inc: { balance: transaction.amount }
      });
    } else if (transaction.type === 'withdrawal') {
      await User.findByIdAndUpdate(transaction.user._id, {
        $inc: { balance: -transaction.amount }
      });
    }
    
    // Send notification
    await Notification.create({
      user: transaction.user._id,
      title: `${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} Approved`,
      message: `Your ${transaction.type} of $${transaction.amount} has been approved.`,
      type: 'transaction'
    });
    
    // Send email
    const emailTemplate = emailTemplates.transactionNotification(
      transaction.user.name,
      transaction.type,
      transaction.amount,
      'approved'
    );
    await sendEmail({
      to: transaction.user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html
    });
    
    res.json({
      success: true,
      message: 'Transaction approved'
    });
  } catch (error) {
    next(error);
  }
});

// Reject transaction
router.post('/transactions/:id/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;
    
    const transaction = await Transaction.findById(req.params.id).populate('user');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    transaction.status = 'failed';
    transaction.processedBy = req.user._id;
    transaction.processedAt = new Date();
    transaction.rejectionReason = reason;
    await transaction.save();
    
    // Send notification
    await Notification.create({
      user: transaction.user._id,
      title: `${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} Rejected`,
      message: `Your ${transaction.type} of $${transaction.amount} was rejected. Reason: ${reason}`,
      type: 'transaction'
    });
    
    res.json({
      success: true,
      message: 'Transaction rejected'
    });
  } catch (error) {
    next(error);
  }
});

// Send notification to user(s)
router.post('/notifications/send', async (req, res, next) => {
  try {
    const { userId, title, message, type = 'info' } = req.body;
    
    if (userId) {
      // Send to specific user
      await Notification.create({
        user: userId,
        title,
        message,
        type
      });
    } else {
      // Broadcast to all users
      const users = await User.find().select('_id');
      const notifications = users.map(u => ({
        user: u._id,
        title,
        message,
        type
      }));
      await Notification.insertMany(notifications);
    }
    
    res.json({
      success: true,
      message: userId ? 'Notification sent' : 'Broadcast sent to all users'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
