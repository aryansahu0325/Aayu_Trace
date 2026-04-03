import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Package, Clock, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { format, differenceInDays, isAfter, isBefore, addDays } from 'date-fns';

interface TimelineProduct {
  id: string;
  name: string;
  brand: string | null;
  expiry_date: string | null;
  warranty_date: string | null;
  category: {
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
}

interface TimelineItem {
  id: string;
  product: TimelineProduct;
  date: string;
  type: 'expiry' | 'warranty';
  daysRemaining: number;
  status: 'expired' | 'critical' | 'warning' | 'good';
}

export const TimelineView = () => {
  const { user } = useAuth();
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'expiry' | 'warranty'>('all');

  const fetchTimelineData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          brand,
          expiry_date,
          warranty_date,
          categories!products_category_id_fkey (
            name,
            icon,
            color
          )
        `)
        .eq('user_id', user.id)
        .eq('is_consumed', false);

      if (error) throw error;

      const items: TimelineItem[] = [];
      const today = new Date();

      (data || []).forEach((product) => {
        // Add expiry date item
        if (product.expiry_date) {
          const expiryDate = new Date(product.expiry_date);
          const daysRemaining = differenceInDays(expiryDate, today);
          
          items.push({
            id: `${product.id}-expiry`,
            product: {
              ...product,
              category: product.categories || null,
            },
            date: product.expiry_date,
            type: 'expiry',
            daysRemaining,
            status: getStatus(daysRemaining),
          });
        }

        // Add warranty date item
        if (product.warranty_date) {
          const warrantyDate = new Date(product.warranty_date);
          const daysRemaining = differenceInDays(warrantyDate, today);
          
          items.push({
            id: `${product.id}-warranty`,
            product: {
              ...product,
              category: product.categories || null,
            },
            date: product.warranty_date,
            type: 'warranty',
            daysRemaining,
            status: getStatus(daysRemaining),
          });
        }
      });

      // Sort by date (nearest first)
      items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setTimelineItems(items);
    } catch (error) {
      console.error('Error fetching timeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (daysRemaining: number): 'expired' | 'critical' | 'warning' | 'good' => {
    if (daysRemaining < 0) return 'expired';
    if (daysRemaining <= 3) return 'critical';
    if (daysRemaining <= 7) return 'warning';
    return 'good';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'expired':
        return 'bg-destructive text-destructive-foreground';
      case 'critical':
        return 'bg-destructive/80 text-destructive-foreground';
      case 'warning':
        return 'bg-warning text-warning-foreground';
      case 'good':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'expired':
        return <AlertTriangle className="h-4 w-4" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <Clock className="h-4 w-4" />;
      case 'good':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'warranty' ? <Shield className="h-4 w-4" /> : <Package className="h-4 w-4" />;
  };

  const filteredItems = filter === 'all' 
    ? timelineItems 
    : timelineItems.filter(item => item.type === filter);

  useEffect(() => {
    fetchTimelineData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <CardTitle>Timeline View</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'expiry' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('expiry')}
              >
                Expiry
              </Button>
              <Button
                variant={filter === 'warranty' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('warranty')}
              >
                Warranty
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items in your timeline</p>
              <p className="text-sm">Add products with dates to see them here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      {getTypeIcon(item.type)}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate">
                          {item.product.name}
                        </h4>
                        {item.product.brand && (
                          <span className="text-xs text-muted-foreground">
                            by {item.product.brand}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.type === 'expiry' ? 'Expires' : 'Warranty ends'}
                        </Badge>
                        {item.product.category && (
                          <Badge variant="outline" className="text-xs">
                            {item.product.category.icon} {item.product.category.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {format(new Date(item.date), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.daysRemaining < 0 
                          ? `${Math.abs(item.daysRemaining)} days ago`
                          : item.daysRemaining === 0 
                          ? 'Today'
                          : `${item.daysRemaining} days left`
                        }
                      </div>
                    </div>
                    
                    <Badge className={`${getStatusColor(item.status)} flex items-center gap-1`}>
                      {getStatusIcon(item.status)}
                      <span className="capitalize">{item.status}</span>
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};