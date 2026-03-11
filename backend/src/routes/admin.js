const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const Investment = require('../models/Investment');
const { protect, adminOnly } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/nodemailer');
const { notifyBalanceUpdate } = require('../websocket/balanceUpdates');

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
      withdrawals,
      activeInvestments,
      totalInvestmentValue
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
      ]),
      Investment.countDocuments({ status: 'active' }),
      Investment.aggregate([
        { $match: { status: 'active' } },
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
        totalWithdrawals: withdrawals[0]?.total || 0,
        activeInvestments,
        totalInvestmentValue: totalInvestmentValue[0]?.total || 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// Dashboard analytics (charts data)
router.get('/dashboard/analytics', async (req, res, next) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Get daily deposits
    const dailyDeposits = await Transaction.aggregate([
      {
        $match: {
          type: 'deposit',
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get daily withdrawals
    const dailyWithdrawals = await Transaction.aggregate([
      {
        $match: {
          type: 'withdrawal',
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get daily new users
    const dailyUsers = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get daily investments
    const dailyInvestments = await Investment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get investment by plan breakdown
    const investmentByPlan = await Investment.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$planName',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);
    
    // Get user growth (cumulative)
    const userGrowth = await User.aggregate([
      {
        $match: { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Calculate cumulative user count
    let cumulativeCount = await User.countDocuments({ createdAt: { $lt: startDate } });
    const cumulativeUserGrowth = userGrowth.map(day => {
      cumulativeCount += day.count;
      return { date: day._id, total: cumulativeCount, newUsers: day.count };
    });
    
    res.json({
      success: true,
      data: {
        dailyDeposits,
        dailyWithdrawals,
        dailyUsers,
        dailyInvestments,
        investmentByPlan,
        userGrowth: cumulativeUserGrowth
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
    const { role, isVerified, balance, kycStatus, unlockAccount } = req.body;
    
    const updates = {};
    if (role) updates.role = role;
    if (typeof isVerified === 'boolean') updates.isVerified = isVerified;
    if (typeof balance === 'number') updates.balance = balance;
    if (kycStatus) updates.kycStatus = kycStatus;
    
    // Unlock account if requested
    if (unlockAccount) {
      updates.loginAttempts = 0;
      updates.lockUntil = undefined;
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates, $unset: unlockAccount ? { lockUntil: 1 } : {} },
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

// Unlock user account
router.post('/users/:id/unlock', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 }
      },
      { new: true }
    ).select('-password -twoFactorSecret');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User account unlocked successfully',
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
    
    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Transaction has already been processed'
      });
    }
    
    transaction.status = 'completed';
    transaction.processedBy = req.user._id;
    transaction.processedAt = new Date();
    await transaction.save();
    
    let newBalance = transaction.user.balance;
    
    // Update user balance
    if (transaction.type === 'deposit') {
      newBalance += transaction.amount;
      await User.findByIdAndUpdate(transaction.user._id, {
        $inc: { balance: transaction.amount }
      });
    } else if (transaction.type === 'withdrawal') {
      newBalance -= transaction.amount;
      await User.findByIdAndUpdate(transaction.user._id, {
        $inc: { balance: -transaction.amount }
      });
    }
    
    // Send real-time balance update via WebSocket
    notifyBalanceUpdate(transaction.user._id, {
      balance: newBalance,
      transaction: {
        type: transaction.type,
        amount: transaction.amount,
        status: 'completed'
      },
      message: `Your ${transaction.type} of $${transaction.amount} has been approved!`
    });
    
    // Send notification
    await Notification.create({
      user: transaction.user._id,
      title: `${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} Approved`,
      message: `Your ${transaction.type} of $${transaction.amount} has been approved.`,
      type: 'transaction'
    });
    
    // Send email
    try {
      const emailTemplate = emailTemplates.transactionNotification(
        transaction.user.name,
        transaction.type,
        transaction.amount,
        'approved',
        null
      );
      await sendEmail({
        to: transaction.user.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      });
      console.log(`Approval email sent to ${transaction.user.email}`);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }
    
    res.json({
      success: true,
      message: 'Transaction approved',
      data: { newBalance }
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
    
    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Transaction has already been processed'
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
    
    // Send email notification
    try {
      const emailTemplate = emailTemplates.transactionNotification(
        transaction.user.name,
        transaction.type,
        transaction.amount,
        'rejected',
        reason
      );
      await sendEmail({
        to: transaction.user.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      });
      console.log(`Rejection email sent to ${transaction.user.email}`);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }
    
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
    const { userId, title, message, type = 'info', sendEmail: shouldSendEmail = false } = req.body;
    
    let notificationsSent = 0;
    let emailsSent = 0;
    let emailErrors = [];
    
    if (userId) {
      // Send to specific user
      const user = await User.findById(userId).select('name email');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Create notification first (emailSent = false initially)
      const notification = await Notification.create({
        user: userId,
        title,
        message,
        type,
        emailSent: false
      });
      notificationsSent = 1;
      
      // Send email if requested
      if (shouldSendEmail && user.email) {
        try {
          const emailResult = await sendEmail({
            to: user.email,
            subject: title,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                <div style="background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #22c55e; margin: 0;">GreenBull Trading</h1>
                  </div>
                  <h2 style="color: #111827; margin-bottom: 16px;">${title}</h2>
                  <p style="color: #374151; font-size: 16px; line-height: 1.6;">${message}</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL || 'https://greebull.onrender.com'}/dashboard" 
                       style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); 
                              color: white; 
                              padding: 14px 30px; 
                              text-decoration: none; 
                              border-radius: 8px; 
                              font-weight: bold;
                              display: inline-block;">
                      Go to Dashboard
                    </a>
                  </div>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                  <p style="color: #9ca3af; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} GreenBull Trading. All rights reserved.</p>
                </div>
              </div>
            `
          });
          
          if (emailResult.success) {
            emailsSent = 1;
            // Only mark emailSent true after confirmed delivery
            await Notification.findByIdAndUpdate(notification._id, { 
              emailSent: true, 
              emailSentAt: new Date() 
            });
            console.log(`Notification email sent to ${user.email}`);
          } else {
            console.error('Email sending returned failure:', emailResult.error);
            emailErrors.push({ email: user.email, error: emailResult.error });
          }
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          emailErrors.push({ email: user.email, error: emailError.message });
        }
      }
    } else {
      // Broadcast to all users
      const users = await User.find().select('_id name email');
      const notifications = users.map(u => ({
        user: u._id,
        title,
        message,
        type,
        emailSent: shouldSendEmail
      }));
      await Notification.insertMany(notifications);
      notificationsSent = users.length;
      
      // Send emails if requested
      if (shouldSendEmail) {
        for (const user of users) {
          if (user.email) {
            try {
              await sendEmail({
                to: user.email,
                subject: title,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                    <div style="background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                      <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #22c55e; margin: 0;">GreenBull Trading</h1>
                      </div>
                      <h2 style="color: #111827; margin-bottom: 16px;">${title}</h2>
                      <p style="color: #374151; font-size: 16px; line-height: 1.6;">${message}</p>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL || 'https://grebull.lovable.app'}/dashboard" 
                           style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); 
                                  color: white; 
                                  padding: 14px 30px; 
                                  text-decoration: none; 
                                  border-radius: 8px; 
                                  font-weight: bold;
                                  display: inline-block;">
                          Go to Dashboard
                        </a>
                      </div>
                      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                      <p style="color: #9ca3af; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} GreenBull Trading. All rights reserved.</p>
                    </div>
                  </div>
                `
              });
              emailsSent++;
              console.log(`Notification email sent to ${user.email}`);
            } catch (emailError) {
              console.error(`Email sending failed for ${user.email}:`, emailError);
              emailErrors.push({ email: user.email, error: emailError.message });
            }
          }
        }
      }
    }
    
    res.json({
      success: true,
      message: userId ? 'Notification sent' : 'Broadcast sent to all users',
      data: {
        notificationsSent,
        emailsSent,
        emailErrors: emailErrors.length > 0 ? emailErrors : undefined
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
