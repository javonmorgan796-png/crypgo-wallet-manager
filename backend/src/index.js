require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const http = require('http');
const WebSocket = require('ws');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const walletRoutes = require('./routes/wallet');
const kycRoutes = require('./routes/kyc');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const investmentRoutes = require('./routes/investments');
const copyTradeRoutes = require('./routes/copyTrade');

// Import WebSocket handlers
const { setupWebSocket } = require('./websocket/priceUpdates');
const { setupBalanceWebSocket } = require('./websocket/balanceUpdates');
const { setupAdminUpdates } = require('./websocket/adminUpdates');
const { setupUserUpdates } = require('./websocket/userUpdates');

// Import cron jobs
const { startCronJobs } = require('./cron/investmentCron');

const app = express();
const server = http.createServer(app);

// WebSocket setup for price updates
const priceWss = new WebSocket.Server({ noServer: true });
setupWebSocket(priceWss);

// WebSocket setup for balance updates
const balanceWss = new WebSocket.Server({ noServer: true });
setupBalanceWebSocket(balanceWss);

// WebSocket setup for admin updates
const adminWss = new WebSocket.Server({ noServer: true });
setupAdminUpdates(adminWss);

// WebSocket setup for user updates (investments, traders, etc.)
const userWss = new WebSocket.Server({ noServer: true });
setupUserUpdates(userWss);

// Handle WebSocket upgrade requests
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;
  
  if (pathname === '/ws/prices') {
    priceWss.handleUpgrade(request, socket, head, (ws) => {
      priceWss.emit('connection', ws, request);
    });
  } else if (pathname === '/ws/balance') {
    balanceWss.handleUpgrade(request, socket, head, (ws) => {
      balanceWss.emit('connection', ws, request);
    });
  } else if (pathname === '/ws/admin') {
    adminWss.handleUpgrade(request, socket, head, (ws) => {
      adminWss.emit('connection', ws, request);
    });
  } else if (pathname === '/ws/user') {
    userWss.handleUpgrade(request, socket, head, (ws) => {
      userWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Security middleware
app.use(helmet());

// CORS configuration for multiple origins
const allowedOrigins = [
  'https://greenb.lovable.app',
  // 'https://greebull.onrender.com',
  'https://preview--greenb.lovable.app',
  'https://id-preview--f7fd61ff-0041-4214-af69-75513e876021.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or matches Lovable preview pattern
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.includes('lovable.app') ||
                      origin.includes('lovableproject.com');
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/copy-trade', copyTradeRoutes);

// Transactions route (for user transactions)
app.use('/api/transactions', require('./routes/wallet'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 3001;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 WebSocket servers available:`);
    console.log(`   - Prices: ws://localhost:${PORT}/ws/prices`);
    console.log(`   - Balance: ws://localhost:${PORT}/ws/balance`);
    
    // Start cron jobs for investment maturity and copy trade simulation
    startCronJobs();
  });
});

module.exports = { app, server };
