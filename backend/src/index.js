require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const walletRoutes = require('./routes/wallet');
const kycRoutes = require('./routes/kyc');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const investmentRoutes = require('./routes/investments');
const copyTradeRoutes = require('./routes/copyTrade');
const signalRoutes = require('./routes/signals');

// WebSockets
const { setupWebSocket } = require('./websocket/priceUpdates');
const { setupBalanceWebSocket } = require('./websocket/balanceUpdates');
const { setupAdminUpdates } = require('./websocket/adminUpdates');
const { setupUserUpdates } = require('./websocket/userUpdates');

// Cron jobs
const { startCronJobs } = require('./cron/investmentCron');

const app = express();
const server = http.createServer(app);

/* =======================
   WebSocket Setup
======================= */
const priceWss = new WebSocket.Server({ noServer: true });
const balanceWss = new WebSocket.Server({ noServer: true });
const adminWss = new WebSocket.Server({ noServer: true });
const userWss = new WebSocket.Server({ noServer: true });

setupWebSocket(priceWss);
setupBalanceWebSocket(balanceWss);
setupAdminUpdates(adminWss);
setupUserUpdates(userWss);

server.on('upgrade', (req, socket, head) => {
  const pathname = req.url;

  if (pathname === '/ws/prices') {
    priceWss.handleUpgrade(req, socket, head, ws => {
      priceWss.emit('connection', ws, req);
    });
  } else if (pathname === '/ws/balance') {
    balanceWss.handleUpgrade(req, socket, head, ws => {
      balanceWss.emit('connection', ws, req);
    });
  } else if (pathname === '/ws/admin') {
    adminWss.handleUpgrade(req, socket, head, ws => {
      adminWss.emit('connection', ws, req);
    });
  } else if (pathname === '/ws/user') {
    userWss.handleUpgrade(req, socket, head, ws => {
      userWss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

/* =======================
   Security & Middleware
======================= */
app.use(helmet());

const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.includes('lovable.app') ||
      origin.includes('lovableproject.com')
    ) {
      return cb(null, true);
    }
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static('uploads'));

/* =======================
   API Routes
======================= */
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/copy-trade', copyTradeRoutes);
app.use('/api/signals', signalRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

/* =======================
   🔥 VITE SPA FIX (THE KEY)
======================= */
const distPath = path.join(__dirname, 'dist');

// Serve frontend
app.use(express.static(distPath));

// Catch ALL non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

/* =======================
   Error Handler
======================= */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: err.message || 'Server error'
  });
});

/* =======================
   Database & Server
======================= */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB error', err);
    process.exit(1);
  });

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startCronJobs();
});
