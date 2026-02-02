const WebSocket = require('ws');

let userWss = null;
const userClients = new Map(); // Map of userId -> ws

function setupUserUpdates(wss) {
  userWss = wss;
  
  wss.on('connection', (ws, request) => {
    let userId = null;
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'subscribe' && data.userId) {
          userId = data.userId;
          userClients.set(userId, ws);
          console.log(`User WebSocket subscribed: ${userId}`);
          
          ws.send(JSON.stringify({
            type: 'subscribed',
            message: 'Successfully subscribed to user updates'
          }));
        }
      } catch (error) {
        console.error('Error parsing user WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      if (userId) {
        userClients.delete(userId);
        console.log(`User WebSocket disconnected: ${userId}`);
      }
    });
    
    ws.on('error', (error) => {
      console.error('User WebSocket error:', error);
      if (userId) {
        userClients.delete(userId);
      }
    });
  });
  
  return wss;
}

// Broadcast to all connected users
function broadcastToAllUsers(event, data) {
  if (!userWss) return;
  
  const message = JSON.stringify({ 
    event, 
    data, 
    timestamp: new Date().toISOString() 
  });
  
  userClients.forEach((ws, userId) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// Send to specific user
function sendToUser(userId, event, data) {
  const ws = userClients.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString()
    }));
  }
}

// Notify all users about investment plans update
function notifyInvestmentPlansUpdate(plans) {
  broadcastToAllUsers('investment_plans_updated', {
    plans,
    message: 'Investment plans have been updated'
  });
}

// Notify all users about traders update
function notifyTradersUpdate(traders) {
  broadcastToAllUsers('traders_updated', {
    traders,
    message: 'Professional traders have been updated'
  });
}

// Notify specific user about their balance update
function notifyUserBalanceUpdate(userId, balance, message) {
  sendToUser(userId, 'balance_update', {
    balance,
    message
  });
}

// Notify specific user about transaction status update
function notifyTransactionUpdate(userId, transaction) {
  sendToUser(userId, 'transaction_update', {
    transaction,
    message: `Your ${transaction.type} has been ${transaction.status}`
  });
}

// Notify specific user about investment update
function notifyInvestmentUpdate(userId, investment) {
  sendToUser(userId, 'investment_update', {
    investment,
    message: `Your investment status: ${investment.status}`
  });
}

// Notify specific user about copy trade update
function notifyCopyTradeUpdate(userId, copyTrade) {
  sendToUser(userId, 'copy_trade_update', {
    copyTrade,
    message: 'Your copy trade has been updated'
  });
}

// Notify about general data refresh
function notifyDataRefresh(type) {
  broadcastToAllUsers('data_refresh', {
    type,
    message: `${type} data has been updated`
  });
}

// Notify about signal updates
function notifySignalUpdate(action, signal) {
  broadcastToAllUsers('signal_update', {
    action,
    signal,
    message: action === 'new_signal' 
      ? `New ${signal.type.toUpperCase()} signal for ${signal.asset}` 
      : `Signal for ${signal.asset} has been updated`
  });
}

module.exports = {
  setupUserUpdates,
  broadcastToAllUsers,
  sendToUser,
  notifyInvestmentPlansUpdate,
  notifyTradersUpdate,
  notifyUserBalanceUpdate,
  notifyTransactionUpdate,
  notifyInvestmentUpdate,
  notifyCopyTradeUpdate,
  notifyDataRefresh,
  notifySignalUpdate
};
