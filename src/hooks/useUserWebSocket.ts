import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const WS_URL = import.meta.env.VITE_WS_URL?.replace('/ws/balance', '/ws/user') || 'wss://greenbull-api.onrender.com/ws/user';

interface UserWebSocketMessage {
  event: string;
  data?: any;
  timestamp?: string;
}

interface UseUserWebSocketOptions {
  onInvestmentPlansUpdate?: (plans: any[]) => void;
  onTradersUpdate?: (traders: any[]) => void;
  onBalanceUpdate?: (balance: number) => void;
  onTransactionUpdate?: (transaction: any) => void;
  onDataRefresh?: (type: string) => void;
}

export function useUserWebSocket(options: UseUserWebSocketOptions = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (!user?.id || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        console.log('User WebSocket connected');
        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
        
        // Subscribe to user updates
        if (wsRef.current && user?.id) {
          wsRef.current.send(JSON.stringify({
            type: 'subscribe',
            userId: user.id
          }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: UserWebSocketMessage = JSON.parse(event.data);
          
          switch (message.event) {
            case 'investment_plans_updated':
              console.log('Investment plans updated via WebSocket');
              if (options.onInvestmentPlansUpdate && message.data?.plans) {
                options.onInvestmentPlansUpdate(message.data.plans);
              }
              toast({
                title: 'Investment Plans Updated',
                description: 'New investment plans are now available!',
              });
              break;
              
            case 'traders_updated':
              console.log('Traders updated via WebSocket');
              if (options.onTradersUpdate && message.data?.traders) {
                options.onTradersUpdate(message.data.traders);
              }
              toast({
                title: 'Traders Updated',
                description: 'Professional traders list has been updated!',
              });
              break;
              
            case 'balance_update':
              console.log('Balance updated via WebSocket');
              if (options.onBalanceUpdate && message.data?.balance !== undefined) {
                options.onBalanceUpdate(message.data.balance);
              }
              break;
              
            case 'transaction_update':
              console.log('Transaction updated via WebSocket');
              if (options.onTransactionUpdate && message.data?.transaction) {
                options.onTransactionUpdate(message.data.transaction);
              }
              toast({
                title: 'Transaction Update',
                description: message.data?.message || 'Your transaction status has changed',
              });
              break;
              
            case 'data_refresh':
              console.log('Data refresh signal received:', message.data?.type);
              if (options.onDataRefresh && message.data?.type) {
                options.onDataRefresh(message.data.type);
              }
              break;
              
            case 'subscribed':
              console.log('Successfully subscribed to user updates');
              break;
          }
        } catch (error) {
          console.error('Failed to parse user WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('User WebSocket disconnected');
        setIsConnected(false);
        
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
        console.error('User WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create User WebSocket:', error);
    }
  }, [user?.id, toast, options]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
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
    isConnected,
    reconnect: connect
  };
}
