import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, DollarSign, Package, Calendar, ShoppingCart, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  brand: string;
  category: { name: string; icon: string; color: string } | null;
  price: number | null;
  purchase_date: string | null;
  expiry_date: string | null;
  is_consumed: boolean;
  created_at: string;
}

interface SpendingData {
  month: string;
  amount: number;
  count: number;
}

interface CategoryData {
  name: string;
  count: number;
  spending: number;
  color: string;
}

export default function Analytics() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('12months');
  const [spendingData, setSpendingData] = useState<SpendingData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [wasteData, setWasteData] = useState<{ expired: number; consumed: number; active: number }>({
    expired: 0,
    consumed: 0,
    active: 0
  });

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  useEffect(() => {
    if (products.length > 0) {
      calculateAnalytics();
    }
  }, [products, selectedPeriod]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(name, icon, color)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      const error = err as Error;
      console.error('Error fetching products:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = () => {
    const now = new Date();
    const periodMonths = selectedPeriod === '6months' ? 6 : 12;
    const startDate = new Date(now.getFullYear(), now.getMonth() - periodMonths, 1);

    // Filter products by selected period
    const filteredProducts = products.filter(product => {
      const productDate = new Date(product.purchase_date || product.created_at);
      return productDate >= startDate;
    });

    // Calculate spending by month
    const monthlySpending: { [key: string]: { amount: number; count: number } } = {};
    
    for (let i = 0; i < periodMonths; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toISOString().substr(0, 7); // YYYY-MM format
      monthlySpending[key] = { amount: 0, count: 0 };
    }

    filteredProducts.forEach(product => {
      const productDate = new Date(product.purchase_date || product.created_at);
      const key = productDate.toISOString().substr(0, 7);
      if (monthlySpending[key]) {
        monthlySpending[key].amount += product.price || 0;
        monthlySpending[key].count += 1;
      }
    });

    const spendingArray = Object.entries(monthlySpending)
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: data.amount,
        count: data.count
      }))
      .reverse();

    setSpendingData(spendingArray);

    // Calculate category data
    const categoryMap: { [key: string]: { count: number; spending: number; color: string } } = {};
    
    filteredProducts.forEach(product => {
      const categoryName = product.category?.name || 'Uncategorized';
      const categoryColor = product.category?.color || '#8884d8';
      
      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = { count: 0, spending: 0, color: categoryColor };
      }
      
      categoryMap[categoryName].count += 1;
      categoryMap[categoryName].spending += product.price || 0;
    });

    const categoryArray = Object.entries(categoryMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        spending: data.spending,
        color: data.color
      }))
      .sort((a, b) => b.spending - a.spending);

    setCategoryData(categoryArray);

    // Calculate waste data
    const expired = filteredProducts.filter(p => 
      p.expiry_date && new Date(p.expiry_date) < now && !p.is_consumed
    ).length;
    
    const consumed = filteredProducts.filter(p => p.is_consumed).length;
    const active = filteredProducts.filter(p => !p.is_consumed && 
      (!p.expiry_date || new Date(p.expiry_date) >= now)
    ).length;

    setWasteData({ expired, consumed, active });
  };

  const totalSpending = spendingData.reduce((sum, item) => sum + item.amount, 0);
  const totalProducts = spendingData.reduce((sum, item) => sum + item.count, 0);
  const avgMonthlySpending = totalSpending / (spendingData.length || 1);

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-lg">Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Insights into your product tracking and spending</p>
          </div>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalSpending.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Last {selectedPeriod === '6months' ? '6' : '12'} months
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products Tracked</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                Last {selectedPeriod === '6months' ? '6' : '12'} months
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Monthly Spending</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${avgMonthlySpending.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Per month average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waste Rate</CardTitle>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalProducts > 0 ? ((wasteData.expired / totalProducts) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">{wasteData.expired} expired items</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Spending Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Spending Trend</CardTitle>
              <CardDescription>Monthly spending over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={spendingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, 'Spending']} />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Category Distribution</CardTitle>
              <CardDescription>Spending by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="spending"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${value}`, 'Spending']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Category Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>Detailed spending by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryData.map((category, index) => (
                  <div key={category.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{category.name}</span>
                      <Badge variant="outline">{category.count} items</Badge>
                    </div>
                    <span className="font-bold">${category.spending.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Product Status */}
          <Card>
            <CardHeader>
              <CardTitle>Product Status Overview</CardTitle>
              <CardDescription>Current status of your products</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-success" />
                    <span className="font-medium">Active Products</span>
                  </div>
                  <span className="text-2xl font-bold text-success">{wasteData.active}</span>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-primary" />
                    <span className="font-medium">Consumed</span>
                  </div>
                  <span className="text-2xl font-bold text-primary">{wasteData.consumed}</span>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-destructive" />
                    <span className="font-medium">Expired (Wasted)</span>
                  </div>
                  <span className="text-2xl font-bold text-destructive">{wasteData.expired}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}