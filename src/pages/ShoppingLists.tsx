import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Plus, ShoppingCart, Edit, Trash2, Check, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShoppingList {
  id: string;
  name: string;
  description: string | null;
  is_completed: boolean;
  created_at: string;
  items?: ShoppingListItem[];
}

interface ShoppingListItem {
  id: string;
  shopping_list_id: string;
  product_name: string;
  brand: string | null;
  quantity: number;
  category: { id: string; name: string; icon: string; color: string } | null;
  notes: string | null;
  is_completed: boolean;
  priority: string | null;
  estimated_price: number | null;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export default function ShoppingLists() {
  const { user } = useAuth();
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  
  const [listFormData, setListFormData] = useState({
    name: '',
    description: ''
  });

  const [itemFormData, setItemFormData] = useState({
    product_name: '',
    brand: '',
    quantity: 1,
    category_id: '',
    notes: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    estimated_price: ''
  });

  useEffect(() => {
    if (user) {
      fetchShoppingLists();
      fetchCategories();
    }
  }, [user]);

  const fetchShoppingLists = async () => {
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select(`
          *,
          shopping_list_items:shopping_list_items(
            *,
            category:categories(id, name, icon, color)
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const listsWithItems = data?.map(list => ({
        ...list,
        items: list.shopping_list_items || []
      })) || [];
      
      setShoppingLists(listsWithItems);
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

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingList) {
        const { error } = await supabase
          .from('shopping_lists')
          .update({
            name: listFormData.name,
            description: listFormData.description || null,
          })
          .eq('id', editingList.id)
          .eq('user_id', user?.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Shopping list updated successfully!",
        });
      } else {
        const { error } = await supabase
          .from('shopping_lists')
          .insert([{
            user_id: user?.id,
            name: listFormData.name,
            description: listFormData.description || null,
          }]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Shopping list created successfully!",
        });
      }

      fetchShoppingLists();
      setDialogOpen(false);
      setEditingList(null);
      setListFormData({ name: '', description: '' });
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedList) return;

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('shopping_list_items')
          .update({
            product_name: itemFormData.product_name,
            brand: itemFormData.brand || null,
            quantity: itemFormData.quantity,
            category_id: itemFormData.category_id || null,
            notes: itemFormData.notes || null,
            priority: itemFormData.priority,
            estimated_price: itemFormData.estimated_price ? parseFloat(itemFormData.estimated_price) : null,
          })
          .eq('id', editingItem.id)
          .eq('user_id', user?.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Item updated successfully!",
        });
      } else {
        const { error } = await supabase
          .from('shopping_list_items')
          .insert([{
            shopping_list_id: selectedList.id,
            user_id: user?.id,
            product_name: itemFormData.product_name,
            brand: itemFormData.brand || null,
            quantity: itemFormData.quantity,
            category_id: itemFormData.category_id || null,
            notes: itemFormData.notes || null,
            priority: itemFormData.priority,
            estimated_price: itemFormData.estimated_price ? parseFloat(itemFormData.estimated_price) : null,
          }]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Item added to shopping list!",
        });
      }

      fetchShoppingLists();
      setItemDialogOpen(false);
      setEditingItem(null);
      setItemFormData({
        product_name: '',
        brand: '',
        quantity: 1,
        category_id: '',
        notes: '',
        priority: 'medium',
        estimated_price: ''
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

  const toggleItemCompleted = async (itemId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({ is_completed: completed })
        .eq('id', itemId)
        .eq('user_id', user?.id);

      if (error) throw error;
      fetchShoppingLists();
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleListCompleted = async (listId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('shopping_lists')
        .update({ is_completed: completed })
        .eq('id', listId)
        .eq('user_id', user?.id);

      if (error) throw error;
      fetchShoppingLists();
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteList = async (listId: string) => {
    try {
      const { error } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', listId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      fetchShoppingLists();
      toast({
        title: "Success",
        description: "Shopping list deleted successfully!",
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

  const generateRecommendations = async () => {
    try {
      // Get products that are running low or expired
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(name, icon, color)
        `)
        .eq('user_id', user?.id)
        .or('is_consumed.eq.true,expiry_date.lt.' + new Date().toISOString().split('T')[0]);

      if (error) throw error;

      if (!products || products.length === 0) {
        toast({
          title: "No Recommendations",
          description: "No products found that need replenishing",
        });
        return;
      }

      // Create a new shopping list with recommendations
      const { data: newList, error: listError } = await supabase
        .from('shopping_lists')
        .insert([{
          user_id: user?.id,
          name: 'Recommended Restock',
          description: 'Auto-generated based on consumed and expired products',
        }])
        .select()
        .single();

      if (listError) throw listError;

      // Add items to the list
      const items = products.map(product => ({
        shopping_list_id: newList.id,
        user_id: user?.id,
        product_name: product.name,
        brand: product.brand,
        quantity: 1,
        category_id: product.category_id,
        priority: 'medium' as const,
        estimated_price: product.price,
      }));

      const { error: itemsError } = await supabase
        .from('shopping_list_items')
        .insert(items);

      if (itemsError) throw itemsError;

      fetchShoppingLists();
      toast({
        title: "Success",
        description: `Created shopping list with ${products.length} recommended items!`,
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive' as const;
      case 'medium': return 'secondary' as const;
      case 'low': return 'outline' as const;
      default: return 'outline' as const;
    }
  };

  const openCreateDialog = () => {
    setEditingList(null);
    setListFormData({ name: '', description: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (list: ShoppingList) => {
    setEditingList(list);
    setListFormData({
      name: list.name,
      description: list.description || ''
    });
    setDialogOpen(true);
  };

  const openItemDialog = (list: ShoppingList, item?: ShoppingListItem) => {
    setSelectedList(list);
    if (item) {
      setEditingItem(item);
      const validPriority = item.priority && ['low', 'medium', 'high'].includes(item.priority) 
        ? item.priority as 'low' | 'medium' | 'high' 
        : 'medium';
      setItemFormData({
        product_name: item.product_name,
        brand: item.brand || '',
        quantity: item.quantity,
        category_id: item.category?.id || '',
        notes: item.notes || '',
        priority: validPriority,
        estimated_price: item.estimated_price?.toString() || ''
      });
    } else {
      setEditingItem(null);
      setItemFormData({
        product_name: '',
        brand: '',
        quantity: 1,
        category_id: '',
        notes: '',
        priority: 'medium',
        estimated_price: ''
      });
    }
    setItemDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-lg">Loading shopping lists...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Shopping Lists</h1>
            <p className="text-muted-foreground">Plan your shopping and track your needs</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={generateRecommendations} variant="outline" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Auto Recommendations
            </Button>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              New List
            </Button>
          </div>
        </div>

        {shoppingLists.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No shopping lists yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first shopping list to organize your shopping
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={generateRecommendations} variant="outline" className="gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Get Recommendations
                </Button>
                <Button onClick={openCreateDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create List
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {shoppingLists.map((list) => {
              const totalItems = list.items?.length || 0;
              const completedItems = list.items?.filter(item => item.is_completed).length || 0;
              const totalEstimatedCost = list.items?.reduce((sum, item) => 
                sum + (item.estimated_price || 0), 0) || 0;

              return (
                <Card key={list.id} className={`${list.is_completed ? 'opacity-75' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={list.is_completed}
                          onCheckedChange={(checked) => 
                            toggleListCompleted(list.id, checked as boolean)
                          }
                        />
                        <div>
                          <CardTitle className={`text-lg ${list.is_completed ? 'line-through' : ''}`}>
                            {list.name}
                          </CardTitle>
                          {list.description && (
                            <CardDescription>{list.description}</CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(list)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteList(list.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>Progress: {completedItems}/{totalItems} items</span>
                        {totalEstimatedCost > 0 && (
                          <span>Est. ${totalEstimatedCost.toFixed(2)}</span>
                        )}
                      </div>
                      
                      {totalItems > 0 && (
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${(completedItems / totalItems) * 100}%` }}
                          />
                        </div>
                      )}

                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {list.items?.slice(0, 5).map((item) => (
                          <div key={item.id} className="flex items-center gap-2 p-2 border rounded">
                            <Checkbox
                              checked={item.is_completed}
                              onCheckedChange={(checked) => 
                                toggleItemCompleted(item.id, checked as boolean)
                              }
                            />
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-medium ${item.is_completed ? 'line-through' : ''}`}>
                                {item.product_name}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {item.brand && <span>{item.brand}</span>}
                                <Badge variant={getPriorityColor(item.priority)} className="text-xs">
                                  {item.priority}
                                </Badge>
                                {item.quantity > 1 && <span>×{item.quantity}</span>}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openItemDialog(list, item)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        
                        {list.items && list.items.length > 5 && (
                          <div className="text-center text-sm text-muted-foreground">
                            +{list.items.length - 5} more items
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => openItemDialog(list)}
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Item
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create/Edit List Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingList ? 'Edit Shopping List' : 'Create New Shopping List'}
              </DialogTitle>
              <DialogDescription>
                {editingList 
                  ? 'Update your shopping list details' 
                  : 'Create a new shopping list to organize your shopping'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateList} className="space-y-4">
              <div>
                <Label htmlFor="name">List Name *</Label>
                <Input
                  id="name"
                  value={listFormData.name}
                  onChange={(e) => setListFormData({ ...listFormData, name: e.target.value })}
                  placeholder="Enter list name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={listFormData.description}
                  onChange={(e) => setListFormData({ ...listFormData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingList ? 'Update List' : 'Create List'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Item Dialog */}
        <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Edit Item' : 'Add Item to List'}
              </DialogTitle>
              <DialogDescription>
                {editingItem 
                  ? 'Update item details' 
                  : `Add a new item to "${selectedList?.name}"`
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product_name">Product Name *</Label>
                  <Input
                    id="product_name"
                    value={itemFormData.product_name}
                    onChange={(e) => setItemFormData({ ...itemFormData, product_name: e.target.value })}
                    placeholder="Enter product name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={itemFormData.brand}
                    onChange={(e) => setItemFormData({ ...itemFormData, brand: e.target.value })}
                    placeholder="Enter brand"
                  />
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={itemFormData.quantity}
                    onChange={(e) => setItemFormData({ ...itemFormData, quantity: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="estimated_price">Estimated Price ($)</Label>
                  <Input
                    id="estimated_price"
                    type="number"
                    step="0.01"
                    value={itemFormData.estimated_price}
                    onChange={(e) => setItemFormData({ ...itemFormData, estimated_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={itemFormData.category_id}
                    onValueChange={(value) => setItemFormData({ ...itemFormData, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={itemFormData.priority}
                    onValueChange={(value: 'low' | 'medium' | 'high') => 
                      setItemFormData({ ...itemFormData, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={itemFormData.notes}
                  onChange={(e) => setItemFormData({ ...itemFormData, notes: e.target.value })}
                  placeholder="Optional notes"
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setItemDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingItem ? 'Update Item' : 'Add Item'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}