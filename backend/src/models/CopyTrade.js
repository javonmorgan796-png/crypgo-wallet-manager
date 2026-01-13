const mongoose = require('mongoose');

const copyTradeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trader',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Copy amount is required'],
    min: [100, 'Minimum copy amount is $100']
  },
  currentValue: {
    type: Number,
    default: function() { return this.amount; }
  },
  profit: {
    type: Number,
    default: 0
  },
  profitPercentage: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'stopped'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: Date,
  settings: {
    stopLoss: {
      type: Number,
      default: 20 // Stop if loss exceeds 20%
    },
    takeProfit: {
      type: Number,
      default: 50 // Take profit at 50%
    },
    copyPercentage: {
      type: Number,
      default: 100 // Copy 100% of trader's trades
    }
  }
}, {
  timestamps: true
});

// Update profit percentage
copyTradeSchema.methods.updateProfit = function(newValue) {
  this.currentValue = newValue;
  this.profit = newValue - this.amount;
  this.profitPercentage = ((newValue - this.amount) / this.amount) * 100;
};

module.exports = mongoose.model('CopyTrade', copyTradeSchema);
