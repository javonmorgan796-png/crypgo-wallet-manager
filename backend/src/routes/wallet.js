const express = require('express');
const multer = require('multer');
const path = require('path');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, verifiedOnly } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/nodemailer');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: './uploads/receipts',
  filename: (req, file, cb) => {
    cb(null, `${req.user._id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images and PDFs are allowed'));
  }
});

// Get wallet balance
router.get('/balance', protect, async (req, res) => {
  res.json({
    success: true,
    data: {
      balance: req.user.balance,
      currency: 'USD'
    }
  });
});

// Deposit
router.post('/deposit', protect, upload.single('receipt'), async (req, res, next) => {
  try {
    const { amount, method } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }
    
    const transaction = await Transaction.create({
      user: req.user._id,
      type: 'deposit',
      amount: parseFloat(amount),
      method,
      status: 'pending',
      receiptUrl: req.file ? `/uploads/receipts/${req.file.filename}` : undefined
    });
    
    // Create notification
    await Notification.create({
      user: req.user._id,
      title: 'Deposit Pending',
      message: `Your deposit of $${amount} is pending approval.`,
      type: 'transaction'
    });
    
    res.status(201).json({
      success: true,
      message: 'Deposit request submitted successfully',
      data: {
        transactionId: transaction._id,
        status: transaction.status
      }
    });
  } catch (error) {
    next(error);
  }
});

// Withdraw
router.post('/withdraw', protect, verifiedOnly, async (req, res, next) => {
  try {
    const { amount, address, method } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }
    
    if (amount > req.user.balance) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }
    
    // Check KYC for large withdrawals
    if (amount > 1000 && req.user.kycStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'KYC verification required for withdrawals over $1,000'
      });
    }
    
    const transaction = await Transaction.create({
      user: req.user._id,
      type: 'withdrawal',
      amount: parseFloat(amount),
      method,
      withdrawalAddress: address,
      status: 'pending'
    });
    
    // Create notification
    await Notification.create({
      user: req.user._id,
      title: 'Withdrawal Pending',
      message: `Your withdrawal of $${amount} is being processed.`,
      type: 'transaction'
    });
    
    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: {
        transactionId: transaction._id,
        status: transaction.status
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get transactions
router.get('/transactions', protect, async (req, res, next) => {
  try {
    const { type, status, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
    
    const filter = { user: req.user._id };
    
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }
    
    const transactions = await Transaction.find(filter)
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

module.exports = router;
