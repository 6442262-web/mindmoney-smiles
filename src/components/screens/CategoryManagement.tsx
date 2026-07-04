import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Tag,
  Utensils,
  Car,
  ShoppingBag,
  FileText,
  Music,
  Heart,
  Briefcase,
  TrendingUp,
  DollarSign,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCategories, Category } from '@/hooks/useCategories';
import { RequiredMark } from '@/components/ui/required-mark';

const iconOptions = [
  { value: 'utensils', icon: Utensils, label: 'อาหาร' },
  { value: 'car', icon: Car, label: 'ขนส่ง' },
  { value: 'shopping-bag', icon: ShoppingBag, label: 'ซื้อของ' },
  { value: 'file-text', icon: FileText, label: 'บิล' },
  { value: 'music', icon: Music, label: 'บันเทิง' },
  { value: 'heart', icon: Heart, label: 'สุขภาพ' },
  { value: 'briefcase', icon: Briefcase, label: 'งาน' },
  { value: 'trending-up', icon: TrendingUp, label: 'การลงทุน' },
  { value: 'dollar-sign', icon: DollarSign, label: 'เงิน' },
  { value: 'tag', icon: Tag, label: 'ทั่วไป' },
];

const colorOptions = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', 
  '#F7DC6F', '#2ECC71', '#3498DB', '#9B59B6', '#E74C3C'
];

interface CategoryFormData {
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
}

export function CategoryManagement() {
  const { categories, loading, createCategory, updateCategory, deleteCategory } = useCategories();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    type: 'expense',
    color: '#FF6B6B',
    icon: 'tag'
  });

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find(opt => opt.value === iconName);
    return iconOption ? iconOption.icon : Tag;
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    if (editingCategory) {
      await updateCategory(editingCategory.id, formData);
    } else {
      await createCategory({
        ...formData,
        is_default: false
      });
    }

    setIsDialogOpen(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      type: 'expense',
      color: '#FF6B6B',
      icon: 'tag'
    });
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type as 'expense' | 'income',
      color: category.color || '#4CAF50',
      icon: category.icon || 'tag'
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบหมวดหมู่นี้?')) {
      await deleteCategory(categoryId);
    }
  };

  const expenseCategories = categories.filter(cat => cat.type === 'expense');
  const incomeCategories = categories.filter(cat => cat.type === 'income');

  if (loading) {
    return (
      <div className="pb-20 px-4 pt-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/settings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Tag className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">จัดการหมวดหมู่</h1>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingCategory(null);
              setFormData({
                name: '',
                type: 'expense',
                color: '#FF6B6B',
                icon: 'tag'
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มหมวดหมู่
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">ชื่อหมวดหมู่<RequiredMark /></Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="กรุณาใส่ชื่อหมวดหมู่"
                />
              </div>

              <div>
                <Label>ประเภท</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: 'income' | 'expense') => 
                    setFormData(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">รายจ่าย</SelectItem>
                    <SelectItem value="income">รายได้</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>ไอคอน</Label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {iconOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        title={option.label}
                        className={`p-2 rounded-lg border transition-colors ${
                          formData.icon === option.value
                            ? 'border-primary bg-primary/10'
                            : 'border-muted hover:border-primary/50'
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, icon: option.value }))}
                      >
                        <IconComponent className="h-5 w-5 mx-auto" />
                        <span className="block text-[10px] text-muted-foreground mt-1 truncate">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>สี</Label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        formData.color === color 
                          ? 'border-foreground scale-110' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSubmit} className="flex-1">
                  {editingCategory ? 'อัพเดท' : 'เพิ่ม'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)} 
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {/* Expense Categories */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4 text-red-600">หมวดหมู่รายจ่าย</h2>
          <div className="space-y-2">
            {expenseCategories.map((category) => {
              const IconComponent = getIconComponent(category.icon || 'tag');
              return (
                <div 
                  key={category.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <IconComponent 
                        className="h-4 w-4" 
                        style={{ color: category.color }}
                      />
                    </div>
                    <span className="font-medium">{category.name}</span>
                    {category.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        ค่าเริ่มต้น
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!category.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Income Categories */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4 text-green-600">หมวดหมู่รายได้</h2>
          <div className="space-y-2">
            {incomeCategories.map((category) => {
              const IconComponent = getIconComponent(category.icon || 'tag');
              return (
                <div 
                  key={category.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <IconComponent 
                        className="h-4 w-4" 
                        style={{ color: category.color }}
                      />
                    </div>
                    <span className="font-medium">{category.name}</span>
                    {category.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        ค่าเริ่มต้น
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!category.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}