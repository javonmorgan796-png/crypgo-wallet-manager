const WebSocket = require('ws');

// Simulated crypto prices (in production, connect to real exchange APIs)
let cryptoPrices = {
  BTC: { symbol: 'BTC', name: 'Bitcoin', price: 43250.80, change24h: 2.34, icon: '₿' },
  ETH: { symbol: 'ETH', name: 'Ethereum', price: 2280.45, change24h: 1.87, icon: 'Ξ' },
  BNB: { symbol: 'BNB', name: 'BNB', price: 312.20, change24h: -0.54, icon: '⬡' },
  SOL: { symbol: 'SOL', name: 'Solana', price: 98.75, change24h: 5.21, icon: '◎' },
  USDT: { symbol: 'USDT', name: 'Tether', price: 1.00, change24h: 0.01, icon: '₮' },
  XRP: { symbol: 'XRP', name: 'Ripple', price: 0.62, change24h: -1.23, icon: '✕' },
  ADA: { symbol: 'ADA', name: 'Cardano', price: 0.58, change24h: 3.45, icon: '₳' },
  DOGE: { symbol: 'DOGE', name: 'Dogecoin', price: 0.087, change24h: 2.11, icon: 'Ð' },
};

// Simulate price updates
const updatePrices = () => {
  Object.keys(cryptoPrices).forEach(symbol => {
    if (symbol === 'USDT') return; // Keep USDT stable
    
    const crypto = cryptoPrices[symbol];
    const priceChange = (Math.random() - 0.5) * 0.002; // ±0.1% change
    const newPrice = crypto.price * (1 + priceChange);
    
    crypto.price = parseFloat(newPrice.toFixed(symbol === 'DOGE' ? 5 : 2));
    crypto.change24h = parseFloat((crypto.change24h + (Math.random() - 0.5) * 0.1).toFixed(2));
    
    // Keep change24h in reasonable bounds
    if (crypto.change24h > 15) crypto.change24h = 15;
    if (crypto.change24h < -15) crypto.change24h = -15;
  });
};

const setupWebSocket = (wss) => {
  console.log('📡 WebSocket server initialized');
  
  // Track connected clients
  const clients = new Set();
  
  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection from:', req.socket.remoteAddress);
    clients.add(ws);
    
    // Send initial prices immediately
    ws.send(JSON.stringify({
      type: 'prices',
      data: Object.values(cryptoPrices),
      timestamp: new Date().toISOString()
    }));
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        // Handle different message types
        switch (data.type) {
          case 'subscribe':
            console.log('Client subscribed to:', data.symbols);
            break;
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });
  
  // Broadcast price updates every 2 seconds
  setInterval(() => {
    updatePrices();
    
    const message = JSON.stringify({
      type: 'prices',
      data: Object.values(cryptoPrices),
      timestamp: new Date().toISOString()
    });
    
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }, 2000);
};

module.exports = { setupWebSocket, cryptoPrices };
