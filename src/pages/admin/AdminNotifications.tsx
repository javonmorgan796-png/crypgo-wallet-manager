import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Send,
  Bell,
  Mail,
  MessageSquare,
  Users,
  User,
  Clock,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface NotificationHistory {
  id: string;
  type: string;
  title: string;
  message: string;
  recipients: string;
  sentAt: string;
  status: string;
}

export function AdminNotifications() {
  const { toast } = useToast();
  const [notificationType, setNotificationType] = useState<'broadcast' | 'individual'>('broadcast');
  const [selectedUser, setSelectedUser] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendPush, setSendPush] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const result = await api.adminGetUsers(1, 100);
      if (result.success && result.data?.users) {
        setUsers(result.data.users.map((u: any) => ({
          id: u._id || u.id,
          name: u.name,
          email: u.email,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Missing Fields",
        description: "Please fill in the title and message",
        variant: "destructive",
      });
      return;
    }

    if (notificationType === 'individual' && !selectedUser) {
      toast({
        title: "No User Selected",
        description: "Please select a user to send the notification to",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const result = await api.adminSendNotification({
        userId: notificationType === 'individual' ? selectedUser : undefined,
        title,
        message,
        type: 'info',
        sendEmail: sendEmail,
      });

      if (result.success) {
        const newNotification: NotificationHistory = {
          id: Date.now().toString(),
          type: notificationType,
          title,
          message,
          recipients: notificationType === 'broadcast' ? 'all' : selectedUser,
          sentAt: new Date().toISOString(),
          status: 'sent',
        };

        setHistory([newNotification, ...history]);
        
        toast({
          title: "Notification Sent",
          description: notificationType === 'broadcast' 
            ? `Notification sent to all users${sendEmail ? ' (with email)' : ''}`
            : `Notification sent to user${sendEmail ? ' (with email)' : ''}`,
        });

        // Reset form
        setTitle('');
        setMessage('');
        setSelectedUser('');
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send notification",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Notifications</h2>
        <p className="text-muted-foreground">Send notifications and messages to users</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose Notification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Compose Notification
            </CardTitle>
            <CardDescription>
              Send in-app notifications and emails to users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Notification Type */}
            <div className="space-y-2">
              <Label>Notification Type</Label>
              <div className="flex gap-2">
                <Button
                  variant={notificationType === 'broadcast' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setNotificationType('broadcast')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Broadcast to All
                </Button>
                <Button
                  variant={notificationType === 'individual' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setNotificationType('individual')}
                >
                  <User className="h-4 w-4 mr-2" />
                  Individual User
                </Button>
              </div>
            </div>

            {/* User Selection (for individual) */}
            {notificationType === 'individual' && (
              <div className="space-y-2">
                <Label>Select User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingUsers ? "Loading users..." : "Select a user..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Notification title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Enter your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />
            </div>

            {/* Delivery Methods */}
            <div className="space-y-2">
              <Label>Delivery Methods</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendPush}
                    onChange={(e) => setSendPush(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Bell className="h-4 w-4" />
                  In-App
                </label>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleSend}
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Notification
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Notification History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Notifications
            </CardTitle>
            <CardDescription>
              History of sent notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No notifications sent yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((notification) => (
                  <div 
                    key={notification.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                      <Badge 
                        variant="outline"
                        className={notification.type === 'broadcast' 
                          ? 'bg-blue-500/10 text-blue-500' 
                          : 'bg-purple-500/10 text-purple-500'
                        }
                      >
                        {notification.type === 'broadcast' ? (
                          <><Users className="h-3 w-3 mr-1" />All</>
                        ) : (
                          <><User className="h-3 w-3 mr-1" />Individual</>
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {notification.type === 'broadcast' 
                          ? 'All users' 
                          : notification.recipients
                        }
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {new Date(notification.sentAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}