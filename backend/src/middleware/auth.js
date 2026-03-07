const User = require('../models/User');

const normalizeSessionId = (rawSessionId) => {
  const rawValue = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  if (typeof rawValue !== 'string') return null;

  let normalized = rawValue.trim();
  if (!normalized) return null;

  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Keep raw value if decode fails
  }

  normalized = normalized.replace(/^"|"$/g, '');

  if (normalized.startsWith('s:')) {
    normalized = normalized.slice(2);
  }

  if (normalized.includes('.')) {
    normalized = normalized.split('.')[0];
  }

  if (normalized.startsWith('sess:')) {
    normalized = normalized.slice(5);
  }

  return normalized || null;
};

const hydrateSessionFromHeader = async (req) => {
  if (!req.sessionStore || !req.session) {
    return false;
  }

  const normalizedSessionId = normalizeSessionId(req.headers['x-session-id']);
  if (!normalizedSessionId) {
    return false;
  }

  const sessionCandidates = [...new Set([normalizedSessionId, `sess:${normalizedSessionId}`])];

  for (const candidate of sessionCandidates) {
    const sessionData = await new Promise((resolve, reject) => {
      req.sessionStore.get(candidate, (err, session) => {
        if (err) reject(err);
        else resolve(session || null);
      });
    });

    if (sessionData?.userId) {
      req.session.userId = sessionData.userId.toString();
      return true;
    }
  }

  return false;
};

// Verify session middleware
const protect = async (req, res, next) => {
  try {
    if (!req.session?.userId) {
      await hydrateSessionFromHeader(req);
    }

    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please log in.'
      });
    }

    const user = await User.findById(req.session.userId);

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        message: 'User not found. Session invalid.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Verified user only middleware
const verifiedOnly = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email to access this feature'
    });
  }
  next();
};

module.exports = { protect, adminOnly, verifiedOnly };
