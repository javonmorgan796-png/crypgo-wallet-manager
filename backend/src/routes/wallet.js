
const express = require('express');
const multer = require('multer');
const path = require('path');

const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/nodemailer');
const {
  notifyNewDeposit,
  notifyNewWithdrawal
} = require('../websocket/adminUpdates');

const router = express.Router();

// ==========================================
// FILE UPLOAD CONFIGURATION
// ==========================================

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    const mimetype =
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf';

    if (extname && mimetype) {
      return cb(null, true);
    }

    return cb(new Error('Only images and PDFs are allowed'));
  }
});

// ==========================================
// GET WALLET BALANCE
// ==========================================

router.get('/balance', protect, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        balance: req.user.balance,
        currency: 'USD'
      }
    });
  } catch (error) {
    console.error('Balance error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve wallet balance'
    });
  }
});

// ==========================================
// DEPOSIT - SUBMIT DEPOSIT REQUEST
// ==========================================

router.post('/deposit', protect, (req, res) => {
  upload.single('receipt')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message:
          err.code === 'LIMIT_FILE_SIZE'
            ? 'File too large (max 5MB)'
            : err.message
      });
    }

    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed'
      });
    }

    try {
      const { amount, method } = req.body;
      const depositAmount = Number(amount);

      if (
        amount === undefined ||
        amount === null ||
        amount === '' ||
        !Number.isFinite(depositAmount) ||
        depositAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid deposit amount'
        });
      }

      if (depositAmount < 100) {
        return res.status(400).json({
          success: false,
          message: 'Minimum deposit is $100'
        });
      }

      let receiptUrl = null;

      if (req.file && req.file.buffer) {
        const base64 = req.file.buffer.toString('base64');

        receiptUrl = `data:${req.file.mimetype};base64,${base64}`;
      }

      const transaction = await Transaction.create({
        user: req.user._id,
        type: 'deposit',
        amount: depositAmount,
        method: method || 'crypto',
        status: 'pending',
        receiptUrl
      });

      await Notification.create({
        user: req.user._id,
        title: 'Deposit Pending',
        message: `Your deposit of $${depositAmount} is pending approval.`,
        type: 'transaction'
      });

      try {
        notifyNewDeposit(transaction);
      } catch (wsErr) {
        console.error('Deposit WebSocket notification error:', wsErr);
      }

      return res.status(201).json({
        success: true,
        message: 'Deposit request submitted successfully',
        data: {
          transactionId: transaction._id,
          status: transaction.status
        }
      });
    } catch (error) {
      console.error('Deposit error:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to process deposit request. Please try again.'
      });
    }
  });
});

// ==========================================
// WITHDRAWAL - NO IN-APP KYC GATE
// Authentication is still required.
// Requests remain pending for processing.
// ==========================================

router.post('/withdraw', protect, async (req, res) => {
  try {
    const { amount, address, method } = req.body;
    const withdrawalAmount = Number(amount);

    // Validate the withdrawal amount.
    if (
      amount === undefined ||
      amount === null ||
      amount === '' ||
      !Number.isFinite(withdrawalAmount) ||
      withdrawalAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid withdrawal amount'
      });
    }

    // Validate the current balance.
    if (
      !Number.isFinite(Number(req.user.balance)) ||
      withdrawalAmount > Number(req.user.balance)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Validate the withdrawal details.
    if (
      typeof address !== 'string' ||
      !address.trim() ||
      typeof method !== 'string' ||
      !method.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal address and method are required'
      });
    }

    // No in-app KYC or email-verification check here.
    // The request is not paid automatically.
    const transaction = await Transaction.create({
      user: req.user._id,
      type: 'withdrawal',
      amount: withdrawalAmount,
      method: method.trim(),
      withdrawalAddress: address.trim(),
      status: 'pending'
    });

    // Notify the user.
    await Notification.create({
      user: req.user._id,
      title: 'Withdrawal Pending',
      message: `Your withdrawal of $${withdrawalAmount} is being processed.`,
      type: 'transaction'
    });

    // Notify administrators.
    try {
      notifyNewWithdrawal(transaction);
    } catch (wsErr) {
      console.error('Withdrawal WebSocket notification error:', wsErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: {
        transactionId: transaction._id,
        status: transaction.status
      }
    });
  } catch (error) {
    console.error('Withdrawal error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to process withdrawal request. Please try again.'
    });
  }
});

// ==========================================
// GET TRANSACTIONS
// ==========================================

router.get('/transactions', protect, async (req, res, next) => {
  try {
    const {
      type,
      status,
      dateFrom,
      dateTo,
      page = '1',
      limit = '20'
    } = req.query;

    const pageNumber = Number(page);
    const pageSize = Number(limit);

    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters'
      });
    }

    const filter = {
      user: req.user._id
    };

    if (type) filter.type = type;
    if (status) filter.status = status;

    if (dateFrom || dateTo) {
      filter.createdAt = {};

      if (dateFrom) {
        const from = new Date(dateFrom);

        if (Number.isNaN(from.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid start date'
          });
        }

        filter.createdAt.$gte = from;
      }

      if (dateTo) {
        const to = new Date(dateTo);

        if (Number.isNaN(to.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid end date'
          });
        }

        filter.createdAt.$lte = to;
      }
    }

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize);

    const total = await Transaction.countDocuments(filter);

    return res.json({
      success: true,
      data: transactions,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
