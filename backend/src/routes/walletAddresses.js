const express = require('express');
const WalletAddress = require('../models/WalletAddress');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Public (any authenticated user): list enabled wallet addresses for deposit page
router.get('/', protect, async (req, res, next) => {
  try {
    const addresses = await WalletAddress.find({ enabled: true }).sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: addresses });
  } catch (err) {
    next(err);
  }
});

// Admin: list all
router.get('/admin', protect, adminOnly, async (req, res, next) => {
  try {
    const addresses = await WalletAddress.find().sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: addresses });
  } catch (err) {
    next(err);
  }
});

// Admin: create
router.post('/admin', protect, adminOnly, async (req, res, next) => {
  try {
    const { currency, label, network, address, qrCode, enabled, order } = req.body;
    if (!currency || !label || !address) {
      return res.status(400).json({ success: false, message: 'currency, label and address are required' });
    }
    if (qrCode && qrCode.length > 2_000_000) {
      return res.status(400).json({ success: false, message: 'QR code image too large (max ~1.5MB)' });
    }
    const created = await WalletAddress.create({
      currency, label, network, address, qrCode, enabled, order,
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

// Admin: update
router.put('/admin/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const { currency, label, network, address, qrCode, enabled, order } = req.body;
    const update = {};
    if (currency !== undefined) update.currency = currency;
    if (label !== undefined) update.label = label;
    if (network !== undefined) update.network = network;
    if (address !== undefined) update.address = address;
    if (qrCode !== undefined) update.qrCode = qrCode;
    if (enabled !== undefined) update.enabled = enabled;
    if (order !== undefined) update.order = order;

    const updated = await WalletAddress.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Wallet address not found' });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// Admin: delete
router.delete('/admin/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const deleted = await WalletAddress.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Wallet address not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
