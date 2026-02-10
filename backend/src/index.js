require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const walletRoutes = require('./routes/wallet');
const kycRoutes = require('./routes/kyc');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const investmentRoutes = require('./routes/investments');
const copyTradeRoutes = require('./routes/copyTrade');
const signalRoutes = require('./routes/signals');

// WebSocket handlers
const { setupWebSocket } = require('./websocket/priceUpdates');
const { setupBalanceWebSocket } = require('./websocket/balanceUpdates');
const { setupAdminUpdates } = require('./websocket/adminUpdates');
const { setupUserUpdates } = require('./websocket/userUpdates');

// Cron
const { startCronJobs } = require('./cron/investmentCron');

const app = express();
const server = http.createServer(app);

/* =======================
   WEBSOCKETS
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
  const { url } = req;

  if (url === '/ws/prices') {
    priceWss.handleUpgrade(req, socket, head, ws =>
      priceWss.emit('connection', ws, req)
    );
  } else if (url === '/ws/balance') {
    balanceWss.handleUpgrade(req, socket, head, ws =>
      balanceWss.emit('connection', ws, req)
    );
  } else if (url === '/ws/admin') {
    adminWss.handleUpgrade(req, socket, head, ws =>
      adminWss.emit('connection', ws, req)
    );
  } else if (url === '/ws/user') {
    userWss.handleUpgrade(req, socket, head, ws =>
      userWss.emit('connection', ws, req)
    );
  } else {
    socket.destroy();
  }
});

/* =======================
   MIDDLEWARE
======================= */
app.use(helmet());

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static('uploads'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api', limiter);

/* =======================
   API ROUTES
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
  res.json({ status: 'ok' });
});

/* =======================
   SERVE VITE FRONTEND
======================= */
const distPath = path.join(__dirname, '../../frontend/dist');

app.use(express.static(distPath));

// SPA catch-all (THIS FIXES REFRESH ERRORS)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

/* =======================
   ERROR HANDLER
======================= */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message });
});

/* =======================
   DB + SERVER START
======================= */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(process.env.PORT || 3001, () => {
      console.log('🚀 Server running');
      startCronJobs();
    });
  })
  .catch(err => {
    console.error('❌ MongoDB error', err);
  });
