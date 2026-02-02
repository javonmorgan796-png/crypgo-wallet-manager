const mongoose = require('mongoose');

const signalSchema = new mongoose.Schema({
  asset: {
    type: String,
    required: [true, 'Asset is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['buy', 'sell', 'hold'],
    required: [true, 'Signal type is required']
  },
  entryPrice: {
    type: Number,
    required: [true, 'Entry price is required']
  },
  takeProfit: {
    type: Number
  },
  stopLoss: {
    type: Number
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'cancelled'],
    default: 'active'
  },
  result: {
    type: String,
    enum: ['pending', 'profit', 'loss', 'breakeven'],
    default: 'pending'
  },
  notes: {
    type: String,
    maxlength: 500
  },
  closedAt: Date,
  closedPrice: Number,
  profitLoss: Number,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient querying
signalSchema.index({ status: 1, createdAt: -1 });
signalSchema.index({ asset: 1 });

module.exports = mongoose.model('Signal', signalSchema);
