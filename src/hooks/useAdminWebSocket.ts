import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';

const WS_URL = import.meta.env.VITE_WS_URL || 'wss://greenbull-wallet-manager.onrender.com';

interface AdminEvent {
  event: string;
  data: any;
  timestamp: string;
}

export function useAdminWebSocket(onEvent?: (event: AdminEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<AdminEvent | null>(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      const ws = new WebSocket(`${WS_URL}/ws/admin`);

      ws.onopen = () => {
        console.log('Admin WebSocket connected');
        setIsConnected(true);
        // Authenticate
        ws.send(JSON.stringify({ type: 'auth', token }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as AdminEvent;
          setLastEvent(data);
          
          // Show toast notifications for important events
          switch (data.event) {
            case 'new_deposit':
              toast.info(`New deposit: $${data.data.amount}`, {
                description: 'A user has submitted a deposit request'
              });
              break;
            case 'new_withdrawal':
              toast.info(`New withdrawal: $${data.data.amount}`, {
                description: 'A user has requested a withdrawal'
              });
              break;
            case 'new_kyc':
              toast.info('New KYC submission', {
                description: 'A user has submitted KYC documents'
              });
              break;
            case 'new_user':
              toast.info(`New user: ${data.data.name}`, {
                description: 'A new user has registered'
              });
              break;
            case 'new_investment':
              toast.info(`New investment: $${data.data.amount}`, {
                description: `Investment in ${data.data.planName}`
              });
              break;
          }
          
          onEvent?.(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Admin WebSocket disconnected');
        setIsConnected(false);
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      };

      ws.onerror = (error) => {
        console.error('Admin WebSocket error:', error);
        ws.close();
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [onEvent]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected, lastEvent };
}
