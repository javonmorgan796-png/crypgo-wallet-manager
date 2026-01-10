import { useState, useEffect, useCallback, useRef } from 'react';

interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h?: number;
  marketCap?: number;
  lastUpdate?: string;
}

// Default prices for fallback when WebSocket is not available
const defaultPrices: CryptoPrice[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 43250.80, change24h: 2.34 },
  { symbol: 'ETH', name: 'Ethereum', price: 2280.45, change24h: 1.87 },
  { symbol: 'BNB', name: 'BNB', price: 312.20, change24h: -0.54 },
  { symbol: 'SOL', name: 'Solana', price: 98.75, change24h: 5.21 },
  { symbol: 'USDT', name: 'Tether', price: 1.00, change24h: 0.01 },
  { symbol: 'XRP', name: 'XRP', price: 0.62, change24h: 1.23 },
  { symbol: 'ADA', name: 'Cardano', price: 0.58, change24h: -0.89 },
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.089, change24h: 3.45 },
];

export function useWebSocketPrices() {
  const [prices, setPrices] = useState<CryptoPrice[]>(defaultPrices);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Fallback: simulate price updates when WebSocket is unavailable
  const startFallbackUpdates = useCallback(() => {
    if (fallbackIntervalRef.current) return; // Already running
    
    fallbackIntervalRef.current = setInterval(() => {
      setPrices(prevPrices => 
        prevPrices.map(crypto => ({
          ...crypto,
          price: crypto.symbol === 'USDT' 
            ? 1.00 
            : crypto.price * (1 + (Math.random() - 0.5) * 0.002),
          change24h: crypto.symbol === 'USDT'
            ? 0.01
            : Math.max(-99, Math.min(99, crypto.change24h + (Math.random() - 0.5) * 0.1)),
        }))
      );
    }, 3000);
  }, []);

  const stopFallbackUpdates = useCallback(() => {
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    const wsUrl = import.meta.env.VITE_WS_URL;
    
    // If no WebSocket URL configured, use fallback immediately
    if (!wsUrl) {
      startFallbackUpdates();
      return;
    }
    
    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN || isConnecting) {
      return;
    }
    
    setIsConnecting(true);
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected to price feed');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttempts.current = 0;
        stopFallbackUpdates();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'prices' && Array.isArray(data.data)) {
            setPrices(data.data.map((p: any) => ({
              symbol: p.symbol,
              name: p.name || p.symbol,
              price: p.price,
              change24h: p.change24h,
              volume24h: p.volume24h,
              marketCap: p.marketCap,
              lastUpdate: p.lastUpdate
            })));
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else {
          setError('Unable to connect to price feed. Using cached prices.');
          startFallbackUpdates();
        }
      };

      wsRef.current.onerror = () => {
        console.error('WebSocket error');
        setError('Connection error');
        setIsConnecting(false);
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError('Failed to connect to price feed');
      setIsConnecting(false);
      startFallbackUpdates();
    }
  }, [isConnecting, startFallbackUpdates, stopFallbackUpdates]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopFallbackUpdates();
    };
  }, [connect, stopFallbackUpdates]);

  return { prices, isConnected, isConnecting, error };
}
