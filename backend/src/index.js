require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Import API routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const walletRoutes = require('./routes/wallet');
const kycRoutes = require('./routes/kyc');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const investmentRoutes = require('./routes/investments');
const copyTradeRoutes = require('./routes/copyTrade');
const signalRoutes = require('./routes/signals');
const walletAddressRoutes = require('./routes/walletAddresses');

// Import WebSocket handlers
const { setupWebSocket } = require('./websocket/priceUpdates');
const { setupBalanceWebSocket } = require('./websocket/balanceUpdates');
const { setupAdminUpdates } = require('./websocket/adminUpdates');
const { setupUserUpdates } = require('./websocket/userUpdates');

// Import cron jobs
const { startCronJobs } = require('./cron/investmentCron');

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
  'https://grebull.lovable.app',
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
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
  exposedHeaders: ['x-session-id']
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for secure cookies behind Render's reverse proxy
app.set('trust proxy', 1);

// ----------------- Session Setup -----------------
const isSecureCookie =
  process.env.NODE_ENV === 'production' ||
  Boolean(process.env.RENDER) ||
  /^https:\/\//i.test(process.env.FRONTEND_URL || '');

const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
  collectionName: 'sessions',
  ttl: 7 * 24 * 60 * 60 // 7 days
});

sessionStore.on('error', (error) => {
  console.error('Session store error:', error);
});

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'greenbull-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  rolling: true,
  store: sessionStore,
  cookie: {
    secure: isSecureCookie,
    httpOnly: true,
    sameSite: isSecureCookie ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
});
app.use(sessionMiddleware);

const normalizeSessionId = (rawSessionId) => {
  const rawValue = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  if (typeof rawValue !== 'string') return null;

  let decoded = rawValue.trim();
  if (!decoded) return null;

  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Keep raw value if decode fails
  }

  decoded = decoded.replace(/^"|"$/g, '');

  if (decoded.startsWith('s:')) {
    decoded = decoded.slice(2);
  }

  if (decoded.includes('.')) {
    decoded = decoded.split('.')[0];
  }

  if (decoded.startsWith('sess:')) {
    decoded = decoded.slice(5);
  }

  return decoded || null;
};

const buildSessionCandidates = (rawSessionId) => {
  const normalized = normalizeSessionId(rawSessionId);
  if (!normalized) return [];

  return [...new Set([normalized, `sess:${normalized}`])];
};

const readSessionFromStore = async (candidateIds) => {
  for (const candidateId of candidateIds) {
    const sessionData = await new Promise((resolve, reject) => {
      sessionStore.get(candidateId, (err, session) => {
        if (err) reject(err);
        else resolve(session || null);
      });
    });

    if (sessionData?.userId || sessionData?.pending2FAUserId) {
      return { sessionData, sessionId: candidateId.replace(/^sess:/, '') };
    }
  }

  return null;
};

// Fallback: If cookie-based session fails (cross-origin), use x-session-id header
app.use(async (req, res, next) => {
  if (req.session?.userId || req.session?.pending2FAUserId) {
    return next();
  }

  const candidateIds = buildSessionCandidates(req.headers['x-session-id']);
  if (!candidateIds.length) {
    return next();
  }

  try {
    const sessionResult = await readSessionFromStore(candidateIds);

    if (sessionResult?.sessionData) {
      if (sessionResult.sessionData.userId) {
        req.session.userId = sessionResult.sessionData.userId;
      }

      if (sessionResult.sessionData.pending2FAUserId) {
        req.session.pending2FAUserId = sessionResult.sessionData.pending2FAUserId;
      }

      req.sessionSourceId = sessionResult.sessionId;
      res.setHeader('x-session-id', sessionResult.sessionId);
    }
  } catch (err) {
    console.error('Header session lookup failed:', err);
  }

  next();
});

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
app.use('/api/wallet-addresses', walletAddressRoutes);

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

module.exports = { app, server };
