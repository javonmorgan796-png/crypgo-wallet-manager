import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import WebSocket from 'ws';

// Import your routes
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

// __dirname fix for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// -------------------- WebSockets --------------------
const priceWss = new WebSocket.Server({ noServer: true });
setupWebSocket(priceWss);

const balanceWss = new WebSocket.Server({ noServer: true });
setupBalanceWebSocket(balanceWss);

const adminWss = new WebSocket.Server({ noServer: true });
setupAdminUpdates(adminWss);

const userWss = new WebSocket.Server({ noServer: true });
setupUserUpdates(userWss);

// Handle WebSocket upgrades
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

// -------------------- Middleware --------------------
app.use(helmet());

const allowedOrigins = [
  'https://greenb.lovable.app',
  'https://greebull.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.includes(origin) ||
                      origin.includes('lovable.app') ||
                      origin.includes('lovableproject.com');
    if (isAllowed) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
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

// Serve static frontend files from Vite build
const frontendDistPath = path.join(__dirname, '../../dist');
app.use(express.static(frontendDistPath));

// -------------------- API Routes --------------------
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/copy-trade', copyTradeRoutes);
app.use('/api/signals', signalRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Fallback for all other frontend routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// -------------------- MongoDB Connection --------------------
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// -------------------- Start Server --------------------
const PORT = process.env.PORT || 3001;
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 WebSocket servers available:`);
    console.log(`   - Prices: ws://localhost:${PORT}/ws/prices`);
    console.log(`   - Balance: ws://localhost:${PORT}/ws/balance`);
    startCronJobs();
  });
});

export { app, server };
