import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const WS_URL = import.meta.env.VITE_WS_URL || 'wss://greenbull-api.onrender.com/ws/balance';

interface BalanceUpdateData {
  balance: number;
  transaction: {
    type: string;
    amount: number;
    status: string;
  };
  message: string;
}

interface BalanceWebSocketMessage {
  type: 'balance_update' | 'subscribed' | 'error';
  data?: BalanceUpdateData;
  message?: string;
  timestamp?: string;
}

export function useBalanceWebSocket(onBalanceUpdate?: (newBalance: number) => void) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!user?.id || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        console.log('Balance WebSocket connected');
        reconnectAttemptsRef.current = 0;
        
        // Subscribe to balance updates for this user
        if (wsRef.current && user?.id) {
          wsRef.current.send(JSON.stringify({
            type: 'subscribe',
            userId: user.id
          }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: BalanceWebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'balance_update' && message.data) {
            console.log('Balance update received:', message.data);
            
            // Show toast notification
            toast({
              title: 'Balance Updated!',
              description: message.data.message,
            });
            
            // Call the callback with new balance
            if (onBalanceUpdate) {
              onBalanceUpdate(message.data.balance);
            }
            
            // Refresh user data to get latest balance
            refreshUser();
          } else if (message.type === 'subscribed') {
            console.log('Successfully subscribed to balance updates');
          }
        } catch (error) {
          console.error('Failed to parse balance WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('Balance WebSocket disconnected');
        
        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Balance WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create Balance WebSocket:', error);
    }
  }, [user?.id, toast, refreshUser, onBalanceUpdate]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user?.id, connect, disconnect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    reconnect: connect
  };
}
