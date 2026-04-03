import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Search, Filter, Edit, Trash2, Plus, Package, Download, Upload, Bot } from 'lucide-react';
import Papa from 'papaparse';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface Product {
  id: string;
  name: string;
  brand: string;
  category: { id: string; name: string; icon: string; color: string } | null;
  expiry_date: string | null;
  warranty_date: string | null;
  price: number | null;
  is_consumed: boolean;
  created_at: string;
  purchase_date: string | null;
  store: string | null;
  notes: string | null;
  batch_number: string | null;
  barcode: string | null;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export default function Products() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchCategories();
    }
  }, [user]);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, selectedCategory, selectedStatus]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name, icon, color)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filterProducts = () => {
    let filtered = products;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category?.id === selectedCategory);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      const now = new Date();
      filtered = filtered.filter(product => {
        switch (selectedStatus) {
          case 'consumed':
            return product.is_consumed;
          case 'active':
            return !product.is_consumed;
          case 'expired':
            return product.expiry_date && new Date(product.expiry_date) < now;
          case 'expiring_soon': {
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            return product.expiry_date && 
                   new Date(product.expiry_date) >= now && 
                   new Date(product.expiry_date) <= thirtyDaysFromNow;
          }
          default:
            return true;
        }
      });
    }

    setFilteredProducts(filtered);
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== productId));
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', selectedProducts)
        .eq('user_id', user?.id);

      if (error) throw error;

      setProducts(products.filter(p => !selectedProducts.includes(p.id)));
      setSelectedProducts([]);
      setShowBulkActions(false);
      toast({
        title: "Success",
        description: `${selectedProducts.length} products deleted successfully`,
      });
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkMarkConsumed = async () => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_consumed: true })
        .in('id', selectedProducts)
        .eq('user_id', user?.id);

      if (error) throw error;

      setProducts(products.map(p => 
        selectedProducts.includes(p.id) ? { ...p, is_consumed: true } : p
      ));
      setSelectedProducts([]);
      setShowBulkActions(false);
      toast({
        title: "Success",
        description: `${selectedProducts.length} products marked as consumed`,
      });
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    const csvData = filteredProducts.map(product => ({
      Name: product.name,
      Brand: product.brand || '',
      Category: product.category?.name || '',
      'Purchase Date': product.purchase_date || '',
      'Expiry Date': product.expiry_date || '',
      'Warranty Date': product.warranty_date || '',
      Price: product.price || '',
      Store: product.store || '',
      Status: product.is_consumed ? 'Consumed' : 'Active'
    }));

    const csvContent = Papa.unparse(csvData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aayutrace-products-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newProducts = results.data.map((row: any) => ({
            user_id: user?.id,
            name: row.Name,
            brand: row.Brand || null,
            purchase_date: row['Purchase Date'] || null,
            expiry_date: row['Expiry Date'] || null,
            warranty_date: row['Warranty Date'] || null,
            price: row.Price ? parseFloat(row.Price) : null,
            store: row.Store || null,
            is_consumed: row.Status === 'Consumed'
          }));

          const { error } = await supabase
            .from('products')
            .insert(newProducts);

          if (error) throw error;
          
          toast({ title: "Import Successful", description: `${newProducts.length} items imported.` });
          fetchProducts();
        } catch (err) {
          toast({ title: "Import Failed", description: (err as Error).message, variant: "destructive" });
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      error: (error: Error) => {
        toast({ title: "Error parsing CSV", description: error.message, variant: "destructive" });
      }
    });
  };

  const getExpiryStatus = (date: string | null) => {
    if (!date) return null;
    const expiryDate = new Date(date);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { status: 'expired', days: Math.abs(diffDays), color: 'destructive' as const };
    if (diffDays <= 7) return { status: 'critical', days: diffDays, color: 'destructive' as const };
    if (diffDays <= 30) return { status: 'warning', days: diffDays, color: 'secondary' as const };
    return { status: 'good', days: diffDays, color: 'default' as const };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-lg">Loading products...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Product Management</h1>
            <p className="text-muted-foreground">Manage all your tracked products</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
            <Button 
              onClick={() => {
                const expiringStatus = ['expired', 'critical', 'warning'];
                const expiring = products
                  .filter(p => !p.is_consumed && expiringStatus.includes(getExpiryStatus(p.expiry_date)?.status as string))
                  .map(p => p.name).join(', ');
                
                if (!expiring) {
                  toast({ title: "No expiring products", description: "You don't have any products expiring soon." });
                  return;
                }
                const evt = new CustomEvent('openChat', { detail: { message: `I have these items expiring soon: ${expiring}. Suggest me 2 simple recipes I can make with them right now to avoid food waste!` } });
                window.dispatchEvent(evt);
              }}
              className="gap-2 bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white border-0"
            >
              <Bot className="h-4 w-4" />
              AI Recipes
            </Button>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => navigate('/add-product')} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="consumed">Consumed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={showBulkActions ? "default" : "outline"}
                onClick={() => setShowBulkActions(!showBulkActions)}
              >
                Bulk Actions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {showBulkActions && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {selectedProducts.length} products selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProducts(
                      selectedProducts.length === filteredProducts.length 
                        ? [] 
                        : filteredProducts.map(p => p.id)
                    )}
                  >
                    {selectedProducts.length === filteredProducts.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkMarkConsumed}
                    disabled={selectedProducts.length === 0}
                  >
                    Mark as Consumed
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={selectedProducts.length === 0}
                  >
                    Delete Selected
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Start by adding your first product'
                }
              </p>
              <Button onClick={() => navigate('/add-product')} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const expiryStatus = getExpiryStatus(product.expiry_date);
              const warrantyStatus = getExpiryStatus(product.warranty_date);
              const isSelected = selectedProducts.includes(product.id);

              return (
                <Card key={product.id} className={`relative ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                  {showBulkActions && (
                    <div className="absolute top-4 left-4 z-10">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedProducts([...selectedProducts, product.id]);
                          } else {
                            setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                          }
                        }}
                      />
                    </div>
                  )}
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{product.category?.icon || '📦'}</div>
                        <div>
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          {product.brand && (
                            <p className="text-sm text-muted-foreground">{product.brand}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/edit-product/${product.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setProductToDelete(product.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{product.category?.name || 'Uncategorized'}</Badge>
                        {product.is_consumed && <Badge variant="secondary">Consumed</Badge>}
                        {product.price && (
                          <Badge variant="outline">${product.price.toFixed(2)}</Badge>
                        )}
                      </div>

                      {(expiryStatus || warrantyStatus) && (
                        <div className="space-y-1">
                          {expiryStatus && (
                            <Badge variant={expiryStatus.color} className="text-xs w-full justify-center">
                              {expiryStatus.status === 'expired' 
                                ? `Expired ${expiryStatus.days}d ago`
                                : `Expires in ${expiryStatus.days}d`}
                            </Badge>
                          )}
                          {warrantyStatus && (
                            <Badge variant={warrantyStatus.color} className="text-xs w-full justify-center">
                              {warrantyStatus.status === 'expired' 
                                ? `Warranty expired ${warrantyStatus.days}d ago`
                                : `Warranty expires in ${warrantyStatus.days}d`}
                            </Badge>
                          )}
                        </div>
                      )}

                      {product.store && (
                        <p className="text-sm text-muted-foreground">Store: {product.store}</p>
                      )}
                      
                      {product.notes && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{product.notes}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this product? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => productToDelete && handleDeleteProduct(productToDelete)}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}