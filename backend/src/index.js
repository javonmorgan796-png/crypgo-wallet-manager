import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';

// Import API routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import walletRoutes from './routes/wallet.js';
import kycRoutes from './routes/kyc.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';
import investmentRoutes from './routes/investments.js';
import copyTradeRoutes from './routes/copyTrade.js';
import signalRoutes from './routes/signals.js';

// Import WebSocket handlers
import { setupWebSocket } from './websocket/priceUpdates.js';
import { setupBalanceWebSocket } from './websocket/balanceUpdates.js';
import { setupAdminUpdates } from './websocket/adminUpdates.js';
import { setupUserUpdates } from './websocket/userUpdates.js';

// Import cron jobs
import { startCronJobs } from './cron/investmentCron.js';

const app = express();
const server = http.createServer(app);

// ----------------- WebSocket Setup -----------------
const priceWss = new WebSocketServer({ noServer: true });
setupWebSocket(priceWss);

const balanceWss = new WebSocketServer({ noServer: true });
setupBalanceWebSocket(balanceWss);

const adminWss = new WebSocketServer({ noServer: true });
setupAdminUpdates(adminWss);

const userWss = new WebSocketServer({ noServer: true });
setupUserUpdates(userWss);

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;

  if (pathname === '/ws/prices') {
    priceWss.handleUpgrade(request, socket, head, (ws) => priceWss.emit('connection', ws, request));
  } else if (pathname === '/ws/balance') {
    balanceWss.handleUpgrade(request, socket, head, (ws) => balanceWss.emit('connection', ws, request));
  } else if (pathname === '/ws/admin') {
    adminWss.handleUpgrade(request, socket, head, (ws) => adminWss.emit('connection', ws, request));
  } else if (pathname === '/ws/user') {
    userWss.handleUpgrade(request, socket, head, (ws) => userWss.emit('connection', ws, request));
  } else {
    socket.destroy();
  }
});

// ----------------- Middleware -----------------
app.use(helmet());

const allowedOrigins = [
  'https://greenb.lovable.app',
  'https://greebull.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.includes(origin) ||
                      origin.includes('lovable.app') ||
                      origin.includes('lovableproject.com');
    callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
  },
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ----------------- API Routes -----------------
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/copy-trade', copyTradeRoutes);
app.use('/api/signals', signalRoutes);

// ----------------- Serve Frontend -----------------
const distPath = path.resolve('backend/dist');
app.use(express.static(distPath));

// SPA fallback for refresh routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ----------------- Error Handling -----------------
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ----------------- MongoDB Connection -----------------
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

// ----------------- Start Server -----------------
const PORT = process.env.PORT || 3001;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 WebSocket servers:`);
    console.log(`   Prices: ws://localhost:${PORT}/ws/prices`);
    console.log(`   Balance: ws://localhost:${PORT}/ws/balance`);

    // Start cron jobs
    startCronJobs();
  });
});

export { app, server };
