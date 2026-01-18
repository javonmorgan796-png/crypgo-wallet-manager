const express = require('express');
const Investment = require('../models/Investment');
const InvestmentPlan = require('../models/InvestmentPlan');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { protect, adminOnly } = require('../middleware/auth');
const { notifyNewInvestment } = require('../websocket/adminUpdates');

const router = express.Router();

// Default investment plans (seeded if DB is empty)
const defaultPlans = [
  { name: 'Bronze', type: 'fixed', minAmount: 100, maxAmount: 999, roi: 10, duration: 30, description: 'Perfect for beginners', features: ['10% ROI', '30-day lock period', 'Daily updates', 'Basic support'] },
  { name: 'Silver', type: 'fixed', minAmount: 1000, maxAmount: 4999, roi: 20, duration: 60, description: 'Ideal for intermediate investors', features: ['20% ROI', '60-day lock period', 'Priority support', 'Weekly reports'], popular: true },
  { name: 'Gold', type: 'fixed', minAmount: 5000, maxAmount: 19999, roi: 30, duration: 90, description: 'For serious investors', features: ['30% ROI', '90-day lock period', '24/7 support', 'Personal manager'] },
  { name: 'Platinum', type: 'fixed', minAmount: 20000, maxAmount: 100000, roi: 50, duration: 180, description: 'Elite tier for maximum returns', features: ['50% ROI', '180-day lock period', 'VIP support', 'Exclusive insights'] },
  { name: '30-Day Sprint', type: 'time-based', minAmount: 500, maxAmount: 50000, roi: 8, duration: 30, description: 'Quick returns in just 30 days', features: ['8% ROI', 'Short commitment', 'Fast liquidity', 'Standard support'] },
  { name: '90-Day Growth', type: 'time-based', minAmount: 500, maxAmount: 50000, roi: 18, duration: 90, description: 'Balanced growth over 3 months', features: ['18% ROI', 'Medium term', 'Good returns', 'Priority support'] },
  { name: '180-Day Builder', type: 'time-based', minAmount: 500, maxAmount: 50000, roi: 35, duration: 180, description: 'Build wealth over 6 months', features: ['35% ROI', 'Long term gains', 'Compound growth', 'Premium support'] },
  { name: '365-Day Maximizer', type: 'time-based', minAmount: 500, maxAmount: 50000, roi: 80, duration: 365, description: 'Maximum returns over a full year', features: ['80% ROI', 'Best long-term value', 'Full compounding', 'VIP support'] },
];

// Seed default plans if none exist
async function ensurePlansExist() {
  try {
    const count = await InvestmentPlan.countDocuments();
    if (count === 0) {
      await InvestmentPlan.insertMany(defaultPlans);
      console.log('Default investment plans seeded');
    }
  } catch (error) {
    console.error('Error seeding investment plans:', error);
  }
}
ensurePlansExist();

// Get all active investment plans (public)
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await InvestmentPlan.find({ isActive: true }).sort('minAmount');
    res.json({
      success: true,
      data: plans.map(p => ({
        id: p._id.toString(),
        name: p.name,
        type: p.type,
        minAmount: p.minAmount,
        maxAmount: p.maxAmount,
        roi: p.roi,
        duration: p.duration,
        description: p.description,
        features: p.features,
        popular: p.popular
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Get all plans (including inactive)
router.get('/admin/plans', protect, adminOnly, async (req, res, next) => {
  try {
    const plans = await InvestmentPlan.find().sort('-createdAt');
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Create new plan
router.post('/admin/plans', protect, adminOnly, async (req, res, next) => {
  try {
    const { name, type, minAmount, maxAmount, roi, duration, description, features, popular, isActive } = req.body;
    
    const plan = await InvestmentPlan.create({
      name,
      type,
      minAmount,
      maxAmount,
      roi,
      duration,
      description,
      features: features || [],
      popular: popular || false,
      isActive: isActive !== false
    });
    
    res.status(201).json({
      success: true,
      message: 'Investment plan created successfully',
      data: plan
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Update plan
router.put('/admin/plans/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const plan = await InvestmentPlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: plan
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Delete plan
router.delete('/admin/plans/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const plan = await InvestmentPlan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }
    
    // Check if there are active investments using this plan
    const activeInvestments = await Investment.countDocuments({ 
      planId: req.params.id, 
      status: 'active' 
    });
    
    if (activeInvestments > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan with ${activeInvestments} active investments. Deactivate it instead.`
      });
    }
    
    await InvestmentPlan.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    next(error);
  }
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
    
    // Find plan from database
    const plan = await InvestmentPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive investment plan'
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
      planId: plan._id.toString(),
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
    
    // Notify admins via WebSocket
    notifyNewInvestment(investment);
    
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
