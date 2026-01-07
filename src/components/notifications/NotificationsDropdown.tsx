import { useState, useEffect } from 'react';
import { Bell, MessageSquare, ArrowDownCircle, ArrowUpCircle, Shield, Gift, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface Notification {
  id: string;
  type: 'admin' | 'deposit' | 'withdrawal' | 'system' | 'promotion';
  title: string;
  message: string;
  time: string;
  read: boolean;
  createdAt: Date;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'admin',
    title: 'Important System Update',
    message: 'We have upgraded our security protocols. Please update your password for enhanced protection.',
    time: '5 min ago',
    read: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: '2',
    type: 'deposit',
    title: 'Deposit Confirmed',
    message: 'Your deposit of $5,000 USDT TRC-20 has been confirmed and credited to your account.',
    time: '15 min ago',
    read: false,
    createdAt: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: '3',
    type: 'withdrawal',
    title: 'Withdrawal Processing',
    message: 'Your withdrawal request of $2,500 BTC is being processed. Expected completion in 24 hours.',
    time: '1 hour ago',
    read: false,
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
  },
  {
    id: '4',
    type: 'admin',
    title: 'Welcome to Green Bull!',
    message: 'Thank you for joining Green Bull. Complete your KYC verification to unlock all features.',
    time: '2 hours ago',
    read: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: '5',
    type: 'promotion',
    title: 'Limited Time Offer',
    message: 'Get 5% bonus on your next deposit! Offer valid until end of month.',
    time: '1 day ago',
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: '6',
    type: 'deposit',
    title: 'Deposit Pending',
    message: 'Your deposit of $10,000 ETH is awaiting confirmation. Please wait for blockchain verification.',
    time: '3 hours ago',
    read: true,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: '7',
    type: 'withdrawal',
    title: 'Withdrawal Completed',
    message: 'Your withdrawal of $1,000 has been successfully sent to your wallet.',
    time: '2 days ago',
    read: true,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
  },
  {
    id: '8',
    type: 'system',
    title: 'Investment Matured',
    message: 'Your Gold Plan investment has matured with 30% ROI. Funds have been credited to your balance.',
    time: '3 days ago',
    read: true,
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
  },
];

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'admin':
      return <MessageSquare className="h-4 w-4 text-primary" />;
    case 'deposit':
      return <ArrowDownCircle className="h-4 w-4 text-primary" />;
    case 'withdrawal':
      return <ArrowUpCircle className="h-4 w-4 text-orange-500" />;
    case 'promotion':
      return <Gift className="h-4 w-4 text-purple-500" />;
    case 'system':
      return <Info className="h-4 w-4 text-blue-500" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [activeTab, setActiveTab] = useState('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'admin') return n.type === 'admin' || n.type === 'promotion';
    if (activeTab === 'transactions') return n.type === 'deposit' || n.type === 'withdrawal';
    return true;
  });

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 bg-card border-border p-0">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-auto py-1 text-primary" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger 
              value="all" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              All
            </TabsTrigger>
            <TabsTrigger 
              value="admin" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Messages
            </TabsTrigger>
            <TabsTrigger 
              value="transactions" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Transactions
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            <ScrollArea className="h-80">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No notifications
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 cursor-pointer hover:bg-secondary/50 transition-colors ${!notification.read ? 'bg-primary/5' : ''}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground truncate">
                              {notification.title}
                            </span>
                            {!notification.read && (
                              <Badge variant="default" className="h-2 w-2 p-0 rounded-full bg-primary flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <span className="text-xs text-muted-foreground mt-2 block">
                            {notification.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
