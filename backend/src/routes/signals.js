const express = require('express');
const Signal = require('../models/Signal');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { notifySignalUpdate } = require('../websocket/userUpdates');

const router = express.Router();

// Get all active signals (public for authenticated users)
router.get('/', protect, async (req, res, next) => {
  try {
    const { status = 'active' } = req.query;
    
    const filter = {};
    if (status !== 'all') {
      filter.status = status;
    }
    
    const signals = await Signal.find(filter)
      .sort('-createdAt')
      .limit(50);
    
    res.json({
      success: true,
      data: signals
    });
  } catch (error) {
    next(error);
  }
});

// Get all signals for admin
router.get('/admin', protect, adminOnly, async (req, res, next) => {
  try {
    const signals = await Signal.find()
      .sort('-createdAt')
      .limit(100);
    
    res.json({
      success: true,
      data: signals
    });
  } catch (error) {
    next(error);
  }
});

// Create new signal (admin only)
router.post('/admin', protect, adminOnly, async (req, res, next) => {
  try {
    const { asset, type, entryPrice, takeProfit, stopLoss, notes } = req.body;
    
    const signal = await Signal.create({
      asset: asset.toUpperCase(),
      type,
      entryPrice,
      takeProfit,
      stopLoss,
      notes,
      createdBy: req.user._id
    });
    
    // Notify all users about the new signal
    notifySignalUpdate('new_signal', signal);
    
    // Create notifications for all users
    const users = await User.find({ isVerified: true }).select('_id');
    const notifications = users.map(user => ({
      user: user._id,
      title: 'New Trading Signal',
      message: `New ${type.toUpperCase()} signal for ${asset.toUpperCase()} at $${entryPrice}`,
      type: 'signal'
    }));
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
    
    res.status(201).json({
      success: true,
      message: 'Signal created successfully',
      data: signal
    });
  } catch (error) {
    next(error);
  }
});

// Update signal (admin only)
router.put('/admin/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const signal = await Signal.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!signal) {
      return res.status(404).json({
        success: false,
        message: 'Signal not found'
      });
    }
    
    // Notify all users about the updated signal
    notifySignalUpdate('signal_updated', signal);
    
    res.json({
      success: true,
      message: 'Signal updated successfully',
      data: signal
    });
  } catch (error) {
    next(error);
  }
});

// Close signal (admin only)
router.post('/admin/:id/close', protect, adminOnly, async (req, res, next) => {
  try {
    const { closedPrice, result } = req.body;
    
    const signal = await Signal.findById(req.params.id);
    
    if (!signal) {
      return res.status(404).json({
        success: false,
        message: 'Signal not found'
      });
    }
    
    signal.status = 'closed';
    signal.closedAt = new Date();
    signal.closedPrice = closedPrice;
    signal.result = result;
    
    // Calculate profit/loss percentage
    if (signal.type === 'buy') {
      signal.profitLoss = ((closedPrice - signal.entryPrice) / signal.entryPrice) * 100;
    } else {
      signal.profitLoss = ((signal.entryPrice - closedPrice) / signal.entryPrice) * 100;
    }
    
    await signal.save();
    
    // Notify all users about the closed signal
    notifySignalUpdate('signal_closed', signal);
    
    res.json({
      success: true,
      message: 'Signal closed successfully',
      data: signal
    });
  } catch (error) {
    next(error);
  }
});

// Delete signal (admin only)
router.delete('/admin/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const signal = await Signal.findByIdAndDelete(req.params.id);
    
    if (!signal) {
      return res.status(404).json({
        success: false,
        message: 'Signal not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Signal deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
