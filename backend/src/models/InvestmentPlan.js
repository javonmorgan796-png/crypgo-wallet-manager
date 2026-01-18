const mongoose = require('mongoose');

const investmentPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['fixed', 'time-based'],
    required: true
  },
  minAmount: {
    type: Number,
    required: true
  },
  maxAmount: {
    type: Number,
    required: true
  },
  roi: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  features: [{
    type: String
  }],
  popular: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('InvestmentPlan', investmentPlanSchema);
