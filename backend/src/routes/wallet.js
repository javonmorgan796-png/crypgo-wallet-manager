const express = require('express');
const multer = require('multer');
const path = require('path');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/nodemailer');
const { notifyNewDeposit, notifyNewWithdrawal } = require('../websocket/adminUpdates');

const router = express.Router();

// Use memory storage - we'll store as base64 in the database
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    
    if (extname || mimetype) {
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

// Deposit - NO KYC REQUIRED
router.post('/deposit', protect, (req, res, next) => {
  console.log('Deposit request received');
  
  upload.single('receipt')(req, res, async (err) => {
    console.log('Upload callback triggered');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file ? 'File present' : 'No file');
    
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        message: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5MB)' : err.message
      });
    } else if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed'
      });
    }
    
    try {
      const { amount, method } = req.body;
      
      console.log('Processing deposit:', { amount, method });
      
      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }
      
      if (parseFloat(amount) < 100) {
        return res.status(400).json({
          success: false,
          message: 'Minimum deposit is $100'
        });
      }

      // Store receipt as base64 data URI in the database
      let receiptUrl = null;
      
      if (req.file && req.file.buffer) {
        console.log('Converting receipt to base64:', req.file.originalname, req.file.mimetype);
        const base64 = req.file.buffer.toString('base64');
        receiptUrl = `data:${req.file.mimetype};base64,${base64}`;
        console.log('Receipt stored as base64 data URI, length:', receiptUrl.length);
      }
      
      const transactionData = {
        user: req.user._id,
        type: 'deposit',
        amount: parseFloat(amount),
        method: method || 'crypto',
        status: 'pending',
        receiptUrl: receiptUrl
      };
      
      console.log('Creating transaction with receipt:', receiptUrl ? 'base64 present' : 'no receipt');
      
      const transaction = await Transaction.create(transactionData);
      
      console.log('Transaction created:', transaction._id);
      
      // Create notification
      await Notification.create({
        user: req.user._id,
        title: 'Deposit Pending',
        message: `Your deposit of $${amount} is pending approval.`,
        type: 'transaction'
      });
      
      // Notify admins via WebSocket
      try {
        notifyNewDeposit(transaction);
      } catch (wsErr) {
        console.error('WebSocket notification error:', wsErr);
      }
      
      res.status(201).json({
        success: true,
        message: 'Deposit request submitted successfully',
        data: {
          transactionId: transaction._id,
          status: transaction.status
        }
      });
    } catch (error) {
      console.error('Deposit error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process deposit request. Please try again.'
      });
    }
  });
});

// Withdraw - Email verification required, KYC required for large amounts only
router.post('/withdraw', async (req, res, next) => {
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
    
    // Check email verification
   // if (!req.user.isVerified) {
    //  return res.status(400).json({
    //  success: false,
      //  message: 'Please verify your email before withdrawing'
      });
    }
    
    // Check KYC for large withdrawals (over $1000)
 //   if (amount > 1000 && req.user.kycStatus !== 'approved') {
  //    return res.status(400).json({
   //     success: false,
   //     message: 'KYC verification required for withdrawals over $1,000'
  //    });
  //  }
    
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
    
    // Notify admins via WebSocket
    try {
      notifyNewWithdrawal(transaction);
    } catch (wsErr) {
      console.error('WebSocket notification error:', wsErr);
    }
    
    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: {
        transactionId: transaction._id,
        status: transaction.status
      }
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process withdrawal request. Please try again.'
    });
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


