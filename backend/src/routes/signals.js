const express = require('express');
const Signal = require('../models/Signal');
const SignalSubscription = require('../models/SignalSubscription');
const Notification = require('../models/Notification');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { notifySignalUpdate } = require('../websocket/userUpdates');
const multer = require('multer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Signal plan prices
const SIGNAL_PLANS = {
  '1_month': { label: '1 Month', price: 50, duration: 30 },
  '2_months': { label: '2 Months', price: 90, duration: 60 },
  '3_months': { label: '3 Months', price: 120, duration: 90 },
  '6_months': { label: '6 Months', price: 200, duration: 180 }
};

// Get signal plans
router.get('/plans', protect, (req, res) => {
  const plans = Object.entries(SIGNAL_PLANS).map(([key, val]) => ({
    id: key,
    ...val
  }));
  res.json({ success: true, data: plans });
});

// Check user subscription status
router.get('/subscription', protect, async (req, res, next) => {
  try {
    const subscription = await SignalSubscription.findOne({
      user: req.user._id,
      status: 'active',
      endDate: { $gte: new Date() }
    });
    
    res.json({
      success: true,
      data: {
        hasAccess: !!subscription,
        subscription: subscription || null
      }
    });
  } catch (error) {
    next(error);
  }
});

// Subscribe to signal plan (with payment receipt)
router.post('/subscribe', protect, upload.single('receipt'), async (req, res, next) => {
  try {
    const { plan } = req.body;
    
    if (!SIGNAL_PLANS[plan]) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }

    let receiptUrl = null;
    if (req.file) {
      const base64 = req.file.buffer.toString('base64');
      receiptUrl = `data:${req.file.mimetype};base64,${base64}`;
    }

    const subscription = await SignalSubscription.create({
      user: req.user._id,
      plan,
      price: SIGNAL_PLANS[plan].price,
      status: 'pending',
      paymentReceipt: receiptUrl
    });

    // Notify admin
    const admins = await User.find({ role: 'admin' }).select('_id');
    if (admins.length > 0) {
      const notifications = admins.map(admin => ({
        user: admin._id,
        title: 'New Signal Subscription',
        message: `${req.user.name} subscribed to ${SIGNAL_PLANS[plan].label} signal plan ($${SIGNAL_PLANS[plan].price}). Pending approval.`,
        type: 'signal'
      }));
      await Notification.insertMany(notifications);
    }

    res.status(201).json({
      success: true,
      message: 'Subscription submitted. Awaiting admin approval.',
      data: subscription
    });
  } catch (error) {
    next(error);
  }
});

// Get all active signals (only for subscribed users)
router.get('/', protect, async (req, res, next) => {
  try {
    // Check subscription
    const subscription = await SignalSubscription.findOne({
      user: req.user._id,
      status: 'active',
      endDate: { $gte: new Date() }
    });

    // Admins always have access
    if (!subscription && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Signal subscription required. Please subscribe to a plan.'
      });
    }

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

// ======= ADMIN ROUTES =======

// Get all signals for admin
router.get('/admin', protect, adminOnly, async (req, res, next) => {
  try {
    const signals = await Signal.find()
      .sort('-createdAt')
      .limit(100);
    
    res.json({ success: true, data: signals });
  } catch (error) {
    next(error);
  }
});

// Get all subscriptions for admin
router.get('/admin/subscriptions', protect, adminOnly, async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const subscriptions = await SignalSubscription.find(filter)
      .populate('user', 'name email')
      .sort('-createdAt');
    
    res.json({ success: true, data: subscriptions });
  } catch (error) {
    next(error);
  }
});

// Approve subscription
router.post('/admin/subscriptions/:id/approve', protect, adminOnly, async (req, res, next) => {
  try {
    const sub = await SignalSubscription.findById(req.params.id).populate('user', 'name email');
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    const plan = SIGNAL_PLANS[sub.plan];
    sub.status = 'active';
    sub.startDate = new Date();
    sub.endDate = new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000);
    await sub.save();

    await Notification.create({
      user: sub.user._id,
      title: 'Signal Subscription Approved',
      message: `Your ${plan.label} signal subscription has been approved. Enjoy premium trading signals!`,
      type: 'signal'
    });

    res.json({ success: true, message: 'Subscription approved', data: sub });
  } catch (error) {
    next(error);
  }
});

// Reject subscription
router.post('/admin/subscriptions/:id/reject', protect, adminOnly, async (req, res, next) => {
  try {
    const { reason } = req.body;
    const sub = await SignalSubscription.findById(req.params.id).populate('user', 'name email');
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    sub.status = 'cancelled';
    await sub.save();

    await Notification.create({
      user: sub.user._id,
      title: 'Signal Subscription Rejected',
      message: `Your signal subscription was rejected. Reason: ${reason || 'N/A'}`,
      type: 'signal'
    });

    res.json({ success: true, message: 'Subscription rejected' });
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
    
    notifySignalUpdate('new_signal', signal);
    
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
      return res.status(404).json({ success: false, message: 'Signal not found' });
    }
    
    notifySignalUpdate('signal_updated', signal);
    
    res.json({ success: true, message: 'Signal updated successfully', data: signal });
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
      return res.status(404).json({ success: false, message: 'Signal not found' });
    }
    
    signal.status = 'closed';
    signal.closedAt = new Date();
    signal.closedPrice = closedPrice;
    signal.result = result;
    
    if (signal.type === 'buy') {
      signal.profitLoss = ((closedPrice - signal.entryPrice) / signal.entryPrice) * 100;
    } else {
      signal.profitLoss = ((signal.entryPrice - closedPrice) / signal.entryPrice) * 100;
    }
    
    await signal.save();
    notifySignalUpdate('signal_closed', signal);
    
    res.json({ success: true, message: 'Signal closed successfully', data: signal });
  } catch (error) {
    next(error);
  }
});

// Delete signal (admin only)
router.delete('/admin/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const signal = await Signal.findByIdAndDelete(req.params.id);
    if (!signal) {
      return res.status(404).json({ success: false, message: 'Signal not found' });
    }
    res.json({ success: true, message: 'Signal deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
