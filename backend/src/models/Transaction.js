const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'investment', 'profit', 'referral_bonus', 'transfer'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount must be positive']
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  method: {
    type: String,
    // Allow any crypto method string (btc, eth, usdt-trc20, etc.)
  },
  
  // For deposits
  receiptUrl: String,
  
  // For withdrawals
  withdrawalAddress: String,
  
  // For transfers
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Processing info
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date,
  rejectionReason: String,
  
  // Transaction reference
  txHash: String,
  externalRef: String,
  
  // Notes
  notes: String,
  adminNotes: String
}, {
  timestamps: true
});

// Indexes for better query performance
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
