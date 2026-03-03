const mongoose = require('mongoose');

const signalSubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    enum: ['1_month', '2_months', '3_months', '6_months'],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'expired', 'cancelled'],
    default: 'pending'
  },
  startDate: Date,
  endDate: Date,
  paymentReceipt: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

signalSubscriptionSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('SignalSubscription', signalSubscriptionSchema);
