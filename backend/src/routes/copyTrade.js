const express = require('express');
const Trader = require('../models/Trader');
const CopyTrade = require('../models/CopyTrade');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { protect, adminOnly } = require('../middleware/auth');
const { notifyTradersUpdate, notifyDataRefresh } = require('../websocket/userUpdates');

const router = express.Router();

// Get all traders
router.get('/traders', async (req, res, next) => {
  try {
    const traders = await Trader.find({ isActive: true })
      .sort('-profitPercentage');
    
    res.json({
      success: true,
      data: traders
    });
  } catch (error) {
    next(error);
  }
});

// Get single trader
router.get('/traders/:id', async (req, res, next) => {
  try {
    const trader = await Trader.findById(req.params.id);
    
    if (!trader) {
      return res.status(404).json({
        success: false,
        message: 'Trader not found'
      });
    }
    
    res.json({
      success: true,
      data: trader
    });
  } catch (error) {
    next(error);
  }
});

// Start copying a trader
router.post('/copy', protect, async (req, res, next) => {
  try {
    const { traderId, amount, settings } = req.body;
    
    // Validate trader
    const trader = await Trader.findById(traderId);
    if (!trader) {
      return res.status(404).json({
        success: false,
        message: 'Trader not found'
      });
    }
    
    // Check minimum amount
    if (amount < trader.minCopyAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum copy amount is $${trader.minCopyAmount}`
      });
    }
    
    // Check user balance
    const user = await User.findById(req.user._id);
    if (user.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }
    
    // Check if already copying this trader
    const existingCopy = await CopyTrade.findOne({
      user: req.user._id,
      trader: traderId,
      status: 'active'
    });
    
    if (existingCopy) {
      return res.status(400).json({
        success: false,
        message: 'You are already copying this trader'
      });
    }
    
    // Deduct from balance
    user.balance -= amount;
    await user.save();
    
    // Create copy trade
    const copyTrade = await CopyTrade.create({
      user: req.user._id,
      trader: traderId,
      amount,
      settings: settings || {}
    });
    
    // Update trader stats
    trader.copierCount += 1;
    trader.totalCopiedAmount += amount;
    trader.followers += 1;
    await trader.save();
    
    // Create transaction
    await Transaction.create({
      user: req.user._id,
      type: 'copy-trade',
      amount,
      status: 'completed',
      description: `Started copying ${trader.name}`,
      reference: `CPY-${copyTrade._id.toString().slice(-8).toUpperCase()}`
    });
    
    // Send notification
    await Notification.create({
      user: req.user._id,
      title: 'Copy Trade Started',
      message: `You are now copying ${trader.name} with $${amount}`,
      type: 'trade'
    });
    
    await copyTrade.populate('trader');
    
    res.status(201).json({
      success: true,
      message: 'Copy trade started successfully',
      data: copyTrade
    });
  } catch (error) {
    next(error);
  }
});

// Get user's copy trades
router.get('/my-copies', protect, async (req, res, next) => {
  try {
    const copies = await CopyTrade.find({ user: req.user._id })
      .populate('trader')
      .sort('-createdAt');
    
    res.json({
      success: true,
      data: copies
    });
  } catch (error) {
    next(error);
  }
});

// Stop copying a trader
router.post('/stop/:id', protect, async (req, res, next) => {
  try {
    const copyTrade = await CopyTrade.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('trader');
    
    if (!copyTrade) {
      return res.status(404).json({
        success: false,
        message: 'Copy trade not found'
      });
    }
    
    if (copyTrade.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Copy trade is not active'
      });
    }
    
    // Stop the copy trade
    copyTrade.status = 'stopped';
    copyTrade.endDate = new Date();
    await copyTrade.save();
    
    // Return funds to user (including profit/loss)
    const user = await User.findById(req.user._id);
    const returnAmount = copyTrade.currentValue;
    user.balance += returnAmount;
    if (copyTrade.profit > 0) {
      user.totalProfit = (user.totalProfit || 0) + copyTrade.profit;
    }
    await user.save();
    
    // Update trader stats
    const trader = await Trader.findById(copyTrade.trader._id);
    if (trader) {
      trader.copierCount = Math.max(0, trader.copierCount - 1);
      trader.totalCopiedAmount = Math.max(0, trader.totalCopiedAmount - copyTrade.amount);
      await trader.save();
    }
    
    // Create transaction
    await Transaction.create({
      user: req.user._id,
      type: 'copy-trade-close',
      amount: returnAmount,
      status: 'completed',
      description: `Closed copy trade with ${copyTrade.trader.name}`,
      reference: `CPYC-${copyTrade._id.toString().slice(-8).toUpperCase()}`
    });
    
    res.json({
      success: true,
      message: 'Copy trade stopped',
      data: {
        returnAmount,
        profit: copyTrade.profit,
        profitPercentage: copyTrade.profitPercentage
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get copy trade stats
router.get('/stats', protect, async (req, res, next) => {
  try {
    const copies = await CopyTrade.find({ user: req.user._id });
    
    const activeCopies = copies.filter(c => c.status === 'active');
    const totalInvested = activeCopies.reduce((sum, c) => sum + c.amount, 0);
    const totalProfit = copies.reduce((sum, c) => sum + c.profit, 0);
    const totalCurrentValue = activeCopies.reduce((sum, c) => sum + c.currentValue, 0);
    
    res.json({
      success: true,
      data: {
        activeCopies: activeCopies.length,
        totalCopies: copies.length,
        totalInvested,
        totalProfit,
        totalCurrentValue,
        averageReturn: copies.length > 0 
          ? copies.reduce((sum, c) => sum + c.profitPercentage, 0) / copies.length 
          : 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Create trader
router.post('/admin/traders', protect, adminOnly, async (req, res, next) => {
  try {
    const trader = await Trader.create(req.body);
    
    // Notify all users about the new trader
    const allTraders = await Trader.find({ isActive: true }).sort('-profitPercentage');
    notifyTradersUpdate(allTraders);
    notifyDataRefresh('traders');
    
    res.status(201).json({
      success: true,
      data: trader
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Update trader
router.put('/admin/traders/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const trader = await Trader.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!trader) {
      return res.status(404).json({
        success: false,
        message: 'Trader not found'
      });
    }
    
    // Notify all users about the updated trader
    const allTraders = await Trader.find({ isActive: true }).sort('-profitPercentage');
    notifyTradersUpdate(allTraders);
    notifyDataRefresh('traders');
    
    res.json({
      success: true,
      data: trader
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Delete trader
router.delete('/admin/traders/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const trader = await Trader.findById(req.params.id);
    
    if (!trader) {
      return res.status(404).json({
        success: false,
        message: 'Trader not found'
      });
    }
    
    // Check for active copies
    const activeCopies = await CopyTrade.countDocuments({
      trader: req.params.id,
      status: 'active'
    });
    
    if (activeCopies > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete trader with ${activeCopies} active copiers`
      });
    }
    
    trader.isActive = false;
    await trader.save();
    
    // Notify all users about the removed trader
    const allTraders = await Trader.find({ isActive: true }).sort('-profitPercentage');
    notifyTradersUpdate(allTraders);
    notifyDataRefresh('traders');
    
    res.json({
      success: true,
      message: 'Trader deactivated'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
