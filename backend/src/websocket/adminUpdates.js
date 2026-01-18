const WebSocket = require('ws');

let adminWss = null;
const adminClients = new Map();

function setupAdminUpdates(server) {
  adminWss = new WebSocket.Server({ noServer: true });
  
  adminWss.on('connection', (ws, request) => {
    const userId = request.userId;
    const isAdmin = request.isAdmin;
    
    if (!isAdmin) {
      ws.close(1008, 'Admin access required');
      return;
    }
    
    adminClients.set(userId, ws);
    console.log(`Admin WebSocket connected: ${userId}`);
    
    ws.on('close', () => {
      adminClients.delete(userId);
      console.log(`Admin WebSocket disconnected: ${userId}`);
    });
    
    ws.on('error', (error) => {
      console.error('Admin WebSocket error:', error);
      adminClients.delete(userId);
    });
  });
  
  return adminWss;
}

function broadcastToAdmins(event, data) {
  if (!adminWss) return;
  
  const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  
  adminClients.forEach((ws, userId) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

function notifyNewDeposit(deposit) {
  broadcastToAdmins('new_deposit', {
    id: deposit._id,
    userId: deposit.user,
    amount: deposit.amount,
    method: deposit.method,
    status: deposit.status
  });
}

function notifyNewWithdrawal(withdrawal) {
  broadcastToAdmins('new_withdrawal', {
    id: withdrawal._id,
    userId: withdrawal.user,
    amount: withdrawal.amount,
    method: withdrawal.method,
    status: withdrawal.status
  });
}

function notifyNewUser(user) {
  broadcastToAdmins('new_user', {
    id: user._id,
    name: user.name,
    email: user.email
  });
}

function notifyNewKYC(kycRequest) {
  broadcastToAdmins('new_kyc', {
    userId: kycRequest.user,
    status: 'pending'
  });
}

function notifyNewInvestment(investment) {
  broadcastToAdmins('new_investment', {
    id: investment._id,
    userId: investment.user,
    planName: investment.planName,
    amount: investment.amount
  });
}

module.exports = {
  setupAdminUpdates,
  broadcastToAdmins,
  notifyNewDeposit,
  notifyNewWithdrawal,
  notifyNewUser,
  notifyNewKYC,
  notifyNewInvestment
};
