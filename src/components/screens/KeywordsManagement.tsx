import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useKeywords, type Keyword } from '@/hooks/useKeywords';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const translations = {
  th: {
    title: 'จัดการคีย์เวิร์ด',
    addKeyword: 'เพิ่มคีย์เวิร์ด',
    category: 'หมวดหมู่',
    keyword: 'คีย์เวิร์ด',
    usageCount: 'ใช้งาน',
    times: 'ครั้ง',
    search: 'ค้นหาคีย์เวิร์ด',
    allCategories: 'ทุกหมวดหมู่',
    noKeywords: 'ไม่มีคีย์เวิร์ด',
    finance: 'การเงิน',
    health: 'สุขภาพ',
    education: 'การศึกษา',
    work: 'งาน',
    personal: 'ส่วนตัว',
    entertainment: 'บันเทิง',
    other: 'อื่นๆ',
    add: 'เพิ่ม',
    cancel: 'ยกเลิก',
    delete: 'ลบ',
    newCategory: 'หมวดหมู่ใหม่',
    enterCategory: 'ป้อนหมวดหมู่ใหม่',
    enterKeyword: 'ป้อนคีย์เวิร์ด',
    back: 'กลับ'
  },
  en: {
    title: 'Keywords Management',
    addKeyword: 'Add Keyword',
    category: 'Category',
    keyword: 'Keyword',
    usageCount: 'Usage',
    times: 'times',
    search: 'Search keywords',
    allCategories: 'All Categories',
    noKeywords: 'No keywords found',
    finance: 'Finance',
    health: 'Health',
    education: 'Education',
    work: 'Work',
    personal: 'Personal',
    entertainment: 'Entertainment',
    other: 'Other',
    add: 'Add',
    cancel: 'Cancel',
    delete: 'Delete',
    newCategory: 'New Category',
    enterCategory: 'Enter new category',
    enterKeyword: 'Enter keyword',
    back: 'Back'
  }
};

const predefinedCategories = [
  'finance',
  'health',
  'education',
  'work',
  'personal',
  'entertainment',
  'other'
];

export function KeywordsManagement() {
  const { language } = useLanguage();
  const t = translations[language];
  
  const { 
    keywords, 
    loading, 
    addOrUpdateKeyword, 
    deleteKeyword, 
    incrementUsage,
    getKeywordsByCategory,
    getCategories 
  } = useKeywords();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  const keywordsByCategory = getKeywordsByCategory();
  const categories = getCategories();

  const filteredKeywords = (): { [category: string]: Keyword[] } => {
    let filtered = keywords;

    if (searchTerm) {
      filtered = filtered.filter(k => 
        k.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
        k.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(k => k.category === selectedCategory);
    }

    return filtered.reduce((acc, keyword) => {
      if (!acc[keyword.category]) {
        acc[keyword.category] = [];
      }
      acc[keyword.category].push(keyword);
      return acc;
    }, {} as { [category: string]: Keyword[] });
  };

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return;

    const category = newCategory === 'custom' ? customCategory : newCategory;
    if (!category.trim()) return;

    await addOrUpdateKeyword(category, newKeyword);
    setNewKeyword('');
    setNewCategory('');
    setCustomCategory('');
    setIsDialogOpen(false);
  };

  const handleKeywordClick = (keyword: any) => {
    incrementUsage(keyword.id);
  };

  const getCategoryName = (category: string) => {
    if (predefinedCategories.includes(category)) {
      return t[category as keyof typeof t] as string;
    }
    return category;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.back}
        </Button>
        <h1 className="text-2xl font-bold">{t.title}</h1>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder={t.allCategories} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t.allCategories}</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {getCategoryName(category)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t.addKeyword}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.addKeyword}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category">{t.category}</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    {predefinedCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {getCategoryName(cat)}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">{t.newCategory}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newCategory === 'custom' && (
                <div>
                  <Label htmlFor="customCategory">{t.newCategory}</Label>
                  <Input
                    id="customCategory"
                    placeholder={t.enterCategory}
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="keyword">{t.keyword}</Label>
                <Input
                  id="keyword"
                  placeholder={t.enterKeyword}
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  {t.cancel}
                </Button>
                <Button onClick={handleAddKeyword}>
                  {t.add}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Keywords Display */}
      <div className="space-y-6">
        {Object.keys(filteredKeywords()).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t.noKeywords}
            </CardContent>
          </Card>
        ) : (
          Object.entries(filteredKeywords()).map(([category, categoryKeywords]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {getCategoryName(category)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {categoryKeywords.length} คำ
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {categoryKeywords
                    .sort((a, b) => b.usage_count - a.usage_count)
                    .map((keyword) => (
                    <div key={keyword.id} className="group relative">
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors pr-8"
                        onClick={() => handleKeywordClick(keyword)}
                      >
                        {keyword.keyword}
                        <span className="ml-2 text-xs opacity-70">
                          {keyword.usage_count}
                        </span>
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteKeyword(keyword.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}