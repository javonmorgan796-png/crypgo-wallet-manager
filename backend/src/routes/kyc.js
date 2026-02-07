const express = require('express');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Use memory storage - we'll store as base64 in the database
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images and PDFs are allowed'));
  }
});

const kycUpload = upload.fields([
  { name: 'id_front', maxCount: 1 },
  { name: 'id_back', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
  { name: 'proof_of_address', maxCount: 1 }
]);

// Get KYC status
router.get('/status', protect, async (req, res) => {
  res.json({
    success: true,
    data: {
      status: req.user.kycStatus,
      documents: req.user.kycDocuments,
      rejectionReason: req.user.kycRejectionReason
    }
  });
});

// Submit KYC documents
router.post('/submit', protect, kycUpload, async (req, res, next) => {
  try {
    const files = req.files;
    const documentType = req.body.documentType || 'national_id';
    
    console.log('KYC submission received:', {
      userId: req.user._id,
      documentType,
      files: files ? Object.keys(files) : 'none'
    });
    
    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one document'
      });
    }
    
    // Build documents array with base64 data URIs
    const documents = [];
    const docTypes = ['id_front', 'id_back', 'selfie', 'proof_of_address'];
    
    for (const type of docTypes) {
      if (files[type] && files[type][0]) {
        const file = files[type][0];
        const base64 = file.buffer.toString('base64');
        const dataUri = `data:${file.mimetype};base64,${base64}`;
        
        documents.push({
          type,
          url: dataUri,
          uploadedAt: new Date()
        });
        
        console.log(`KYC ${type} stored as base64, size: ${dataUri.length} chars`);
      }
    }
    
    console.log('Documents to save:', documents.length);
    
    // Update user KYC status
    req.user.kycDocuments = documents;
    req.user.kycStatus = 'pending';
    req.user.kycRejectionReason = undefined;
    await req.user.save();
    
    console.log('User KYC updated:', {
      userId: req.user._id,
      kycStatus: req.user.kycStatus,
      documentsCount: documents.length
    });
    
    // Create notification
    await Notification.create({
      user: req.user._id,
      title: 'KYC Submitted',
      message: 'Your KYC documents have been submitted and are under review.',
      type: 'kyc'
    });
    
    res.json({
      success: true,
      message: 'KYC documents submitted successfully',
      data: {
        status: 'pending',
        documents: documents.length
      }
    });
  } catch (error) {
    console.error('KYC submission error:', error);
    next(error);
  }
});

module.exports = router;