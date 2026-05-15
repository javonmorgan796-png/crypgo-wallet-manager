const mongoose = require('mongoose');

const walletAddressSchema = new mongoose.Schema({
  currency: {
    type: String,
    required: [true, 'Currency code is required'],
    trim: true,
    uppercase: true,
  },
  label: {
    type: String,
    required: [true, 'Label is required'],
    trim: true,
  },
  network: {
    type: String,
    trim: true,
    default: '',
  },
  address: {
    type: String,
    required: [true, 'Wallet address is required'],
    trim: true,
  },
  qrCode: {
    type: String, // base64 data URI
    default: '',
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('WalletAddress', walletAddressSchema);
