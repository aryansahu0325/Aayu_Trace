import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Bell, Settings, TestTube, CalendarDays } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { TimelineView } from '@/components/TimelineView';
import { toast } from '@/hooks/use-toast';

export default function Notifications() {
  const navigate = useNavigate();
  const { 
    notifications, 
    settings, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    updateSettings,
    generateTestNotification
  } = useNotifications();
  
  const [activeTab, setActiveTab] = useState<'notifications' | 'timeline' | 'settings'>('notifications');

  const handleSettingsUpdate = async (key: string, value: number | boolean) => {
    if (!settings) return;
    
    await updateSettings({ [key]: value });
    toast({
      title: "Settings Updated",
      description: "Your notification preferences have been saved.",
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'expiry':
        return '⚠️';
      case 'warranty':
        return '🛡️';
      case 'reminder':
        return '⏰';
      default:
        return 'ℹ️';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-primary">Notifications</h1>
          <p className="text-muted-foreground">Manage your alerts and preferences</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Tab Navigation */}
        <Card className="mb-6">
          <CardContent className="p-0">
            <div className="flex border-b">
              <Button
                variant={activeTab === 'notifications' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('notifications')}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <Bell className="h-4 w-4 mr-2" />
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </Button>
              <Button
                variant={activeTab === 'timeline' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('timeline')}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Timeline
              </Button>
              <Button
                variant={activeTab === 'settings' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('settings')}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Notifications</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateTestNotification}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Notification
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllAsRead}
                  >
                    Mark All Read
                  </Button>
                )}
              </div>
            </div>

            {notifications.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No notifications yet</h3>
                  <p className="text-muted-foreground mb-4">
                    When your products are nearing expiry or warranty end dates, you'll see notifications here.
                  </p>
                  <Button variant="outline" onClick={generateTestNotification}>
                    <TestTube className="h-4 w-4 mr-2" />
                    Generate Test Notification
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`transition-all hover:shadow-md ${
                      !notification.is_read ? 'border-l-4 border-l-primary bg-primary/5' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <span className="text-xl">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm mb-1">
                              {notification.title}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(notification.created_at)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!notification.is_read && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                            >
                              Mark Read
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && <TimelineView />}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Configure how and when you receive notifications about your products.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="expiry_days">Expiry Reminder (days before)</Label>
                    <Input
                      id="expiry_days"
                      type="number"
                      min="1"
                      max="365"
                      value={settings?.expiry_reminder_days || 7}
                      onChange={(e) => handleSettingsUpdate('expiry_reminder_days', parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Get notified this many days before products expire
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="warranty_days">Warranty Reminder (days before)</Label>
                    <Input
                      id="warranty_days"
                      type="number"
                      min="1"
                      max="365"
                      value={settings?.warranty_reminder_days || 30}
                      onChange={(e) => handleSettingsUpdate('warranty_reminder_days', parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Get notified this many days before warranties expire
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Notification Methods</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email_notifications">Email Notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      id="email_notifications"
                      checked={settings?.email_notifications || false}
                      onCheckedChange={(checked) => handleSettingsUpdate('email_notifications', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="push_notifications">Push Notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Receive browser notifications (when available)
                      </p>
                    </div>
                    <Switch
                      id="push_notifications"
                      checked={settings?.push_notifications || false}
                      onCheckedChange={(checked) => handleSettingsUpdate('push_notifications', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="daily_digest">Daily Digest</Label>
                      <p className="text-xs text-muted-foreground">
                        Receive a daily summary of upcoming expirations
                      </p>
                    </div>
                    <Switch
                      id="daily_digest"
                      checked={settings?.daily_digest || false}
                      onCheckedChange={(checked) => handleSettingsUpdate('daily_digest', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}