require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');
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
const signalRoutes = require('./routes/signals');

// Import WebSocket handlers
const { setupWebSocket } = require('./websocket/priceUpdates');
const { setupBalanceWebSocket } = require('./websocket/balanceUpdates');
const { setupAdminUpdates } = require('./websocket/adminUpdates');
const { setupUserUpdates } = require('./websocket/userUpdates');

// Import cron jobs
const { startCronJobs } = require('./cron/investmentCron');

const app = express();
const server = http.createServer(app);

// WebSocket setup (same as before)
const priceWss = new WebSocket.Server({ noServer: true });
setupWebSocket(priceWss);
const balanceWss = new WebSocket.Server({ noServer: true });
setupBalanceWebSocket(balanceWss);
const adminWss = new WebSocket.Server({ noServer: true });
setupAdminUpdates(adminWss);
const userWss = new WebSocket.Server({ noServer: true });
setupUserUpdates(userWss);

server.on('upgrade', (req, socket, head) => {
  const pathname = req.url;
  if (pathname === '/ws/prices') priceWss.handleUpgrade(req, socket, head, ws => priceWss.emit('connection', ws, req));
  else if (pathname === '/ws/balance') balanceWss.handleUpgrade(req, socket, head, ws => balanceWss.emit('connection', ws, req));
  else if (pathname === '/ws/admin') adminWss.handleUpgrade(req, socket, head, ws => adminWss.emit('connection', ws, req));
  else if (pathname === '/ws/user') userWss.handleUpgrade(req, socket, head, ws => userWss.emit('connection', ws, req));
  else socket.destroy();
});

// Middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve frontend build (Vite outputs to src/dist)
const frontendBuildPath = path.join(__dirname, '../../src/dist');
app.use(express.static(frontendBuildPath));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/copy-trade', copyTradeRoutes);
app.use('/api/signals', signalRoutes);

// Catch-all: serve index.html for client-side routing (React refresh fix)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
  startCronJobs();
});
