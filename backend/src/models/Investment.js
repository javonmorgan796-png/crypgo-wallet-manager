const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planId: {
    type: String,
    required: true
  },
  planName: {
    type: String,
    required: true
  },
  planType: {
    type: String,
    enum: ['fixed', 'time-based', 'flexible'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount must be positive']
  },
  roi: {
    type: Number,
    required: true
  },
  expectedReturn: {
    type: Number,
    required: true
  },
  currentProfit: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'pending'],
    default: 'active'
  },
  autoRenew: {
    type: Boolean,
    default: false
  },
  lastProfitUpdate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
investmentSchema.index({ user: 1, status: 1 });
investmentSchema.index({ endDate: 1, status: 1 });

// Calculate daily profit
investmentSchema.methods.calculateDailyProfit = function() {
  const totalDays = Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
  const totalProfit = this.expectedReturn - this.amount;
  return totalProfit / totalDays;
};

// Calculate current profit based on time elapsed
investmentSchema.methods.calculateCurrentProfit = function() {
  const now = new Date();
  const startDate = new Date(this.startDate);
  const endDate = new Date(this.endDate);
  
  if (now >= endDate) {
    return this.expectedReturn - this.amount;
  }
  
  const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
  const elapsedDays = (now - startDate) / (1000 * 60 * 60 * 24);
  const totalProfit = this.expectedReturn - this.amount;
  
  return (elapsedDays / totalDays) * totalProfit;
};

module.exports = mongoose.model('Investment', investmentSchema);
