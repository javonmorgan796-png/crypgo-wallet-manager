const express = require('express');
const Investment = require('../models/Investment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Investment Plans Configuration
const investmentPlans = {
  // Fixed Tier Plans
  bronze: { id: 'bronze', name: 'Bronze', type: 'fixed', minAmount: 100, maxAmount: 999, roi: 10, duration: 30 },
  silver: { id: 'silver', name: 'Silver', type: 'fixed', minAmount: 1000, maxAmount: 4999, roi: 20, duration: 60 },
  gold: { id: 'gold', name: 'Gold', type: 'fixed', minAmount: 5000, maxAmount: 19999, roi: 30, duration: 90 },
  platinum: { id: 'platinum', name: 'Platinum', type: 'fixed', minAmount: 20000, maxAmount: 100000, roi: 50, duration: 180 },
  // Time-based Plans
  'time-30': { id: 'time-30', name: '30-Day Sprint', type: 'time-based', minAmount: 500, maxAmount: 50000, roi: 8, duration: 30 },
  'time-90': { id: 'time-90', name: '90-Day Growth', type: 'time-based', minAmount: 500, maxAmount: 50000, roi: 18, duration: 90 },
  'time-180': { id: 'time-180', name: '180-Day Builder', type: 'time-based', minAmount: 500, maxAmount: 50000, roi: 35, duration: 180 },
  'time-365': { id: 'time-365', name: '365-Day Maximizer', type: 'time-based', minAmount: 500, maxAmount: 50000, roi: 80, duration: 365 },
};

// Get all investment plans
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    data: Object.values(investmentPlans)
  });
});

// Get user's investments
router.get('/my-investments', protect, async (req, res, next) => {
  try {
    const investments = await Investment.find({ user: req.user._id })
      .sort('-createdAt');
    
    // Calculate current profits for each investment
    const investmentsWithProfit = investments.map(inv => {
      const invObj = inv.toObject();
      invObj.currentProfit = inv.calculateCurrentProfit();
      return invObj;
    });
    
    res.json({
      success: true,
      data: investmentsWithProfit
    });
  } catch (error) {
    next(error);
  }
});

// Create new investment
router.post('/create', protect, async (req, res, next) => {
  try {
    const { planId, amount } = req.body;
    
    const plan = investmentPlans[planId];
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid investment plan'
      });
    }
    
    const investAmount = parseFloat(amount);
    
    // Validate amount
    if (investAmount < plan.minAmount || investAmount > plan.maxAmount) {
      return res.status(400).json({
        success: false,
        message: `Amount must be between $${plan.minAmount} and $${plan.maxAmount}`
      });
    }
    
    // Check user balance
    if (req.user.balance < investAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }
    
    // Calculate expected return
    const expectedReturn = investAmount * (1 + plan.roi / 100);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);
    
    // Create investment
    const investment = await Investment.create({
      user: req.user._id,
      planId: plan.id,
      planName: plan.name,
      planType: plan.type,
      amount: investAmount,
      roi: plan.roi,
      expectedReturn,
      endDate,
      status: 'active'
    });
    
    // Deduct from user balance
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 
        balance: -investAmount,
        totalInvested: investAmount
      }
    });
    
    // Create transaction record
    await Transaction.create({
      user: req.user._id,
      type: 'investment',
      amount: investAmount,
      status: 'completed',
      notes: `Investment in ${plan.name} plan`
    });
    
    // Create notification
    await Notification.create({
      user: req.user._id,
      title: 'Investment Created',
      message: `You have invested $${investAmount.toLocaleString()} in ${plan.name}. Expected return: $${expectedReturn.toLocaleString()} after ${plan.duration} days.`,
      type: 'investment'
    });
    
    res.status(201).json({
      success: true,
      message: 'Investment created successfully',
      data: investment
    });
  } catch (error) {
    next(error);
  }
});

// Get investment statistics
router.get('/stats', protect, async (req, res, next) => {
  try {
    const investments = await Investment.find({ user: req.user._id });
    
    const stats = {
      totalInvested: 0,
      activeInvestments: 0,
      totalExpectedReturn: 0,
      currentProfit: 0,
      completedInvestments: 0
    };
    
    investments.forEach(inv => {
      if (inv.status === 'active') {
        stats.activeInvestments++;
        stats.totalInvested += inv.amount;
        stats.totalExpectedReturn += inv.expectedReturn;
        stats.currentProfit += inv.calculateCurrentProfit();
      } else if (inv.status === 'completed') {
        stats.completedInvestments++;
      }
    });
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// Cancel investment (with penalty)
router.post('/:id/cancel', protect, async (req, res, next) => {
  try {
    const investment = await Investment.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'active'
    });
    
    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found or already completed'
      });
    }
    
    // Apply 10% cancellation penalty
    const refundAmount = investment.amount * 0.9;
    
    investment.status = 'cancelled';
    await investment.save();
    
    // Refund to user balance
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 
        balance: refundAmount,
        totalInvested: -investment.amount
      }
    });
    
    // Create transaction record
    await Transaction.create({
      user: req.user._id,
      type: 'investment',
      amount: refundAmount,
      status: 'completed',
      notes: `Investment cancelled with 10% penalty. Original: $${investment.amount}`
    });
    
    // Create notification
    await Notification.create({
      user: req.user._id,
      title: 'Investment Cancelled',
      message: `Your investment in ${investment.planName} has been cancelled. $${refundAmount.toLocaleString()} has been refunded to your balance (10% penalty applied).`,
      type: 'investment'
    });
    
    res.json({
      success: true,
      message: 'Investment cancelled successfully',
      data: { refundAmount }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
