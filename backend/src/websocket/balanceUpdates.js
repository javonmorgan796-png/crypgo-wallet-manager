// WebSocket for real-time balance updates
const connectedClients = new Map();

function setupBalanceWebSocket(wss) {
  wss.on('connection', (ws, req) => {
    console.log('Balance WebSocket client connected');
    
    let userId = null;
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        // Handle authentication/subscription
        if (data.type === 'subscribe' && data.userId) {
          userId = data.userId;
          connectedClients.set(userId, ws);
          console.log(`User ${userId} subscribed to balance updates`);
          
          ws.send(JSON.stringify({
            type: 'subscribed',
            message: 'Successfully subscribed to balance updates'
          }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      if (userId) {
        connectedClients.delete(userId);
        console.log(`User ${userId} disconnected from balance updates`);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
}

// Function to notify a user of balance update
function notifyBalanceUpdate(userId, data) {
  const client = connectedClients.get(userId.toString());
  
  if (client && client.readyState === 1) { // WebSocket.OPEN
    client.send(JSON.stringify({
      type: 'balance_update',
      data: {
        balance: data.balance,
        transaction: data.transaction,
        message: data.message
      },
      timestamp: new Date().toISOString()
    }));
    console.log(`Balance update sent to user ${userId}`);
    return true;
  }
  return false;
}

// Function to broadcast to all connected clients
function broadcastMessage(message) {
  connectedClients.forEach((client, userId) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(message));
    }
  });
}

module.exports = {
  setupBalanceWebSocket,
  notifyBalanceUpdate,
  broadcastMessage
};
