const mongoose = require('mongoose');

const traderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Trader name is required'],
    trim: true
  },
  avatar: {
    type: String,
    default: function() {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.name}`;
    }
  },
  specialization: {
    type: String,
    required: true,
    trim: true
  },
  bio: String,
  winRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  totalProfit: {
    type: Number,
    default: 0
  },
  profitPercentage: {
    type: Number,
    default: 0
  },
  followers: {
    type: Number,
    default: 0
  },
  trades: {
    type: Number,
    default: 0
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  monthlyReturns: [{
    type: Number
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  minCopyAmount: {
    type: Number,
    default: 100
  },
  maxCopyAmount: {
    type: Number,
    default: 100000
  },
  copierCount: {
    type: Number,
    default: 0
  },
  totalCopiedAmount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Trader', traderSchema);
