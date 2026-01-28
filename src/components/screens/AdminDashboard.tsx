import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Users, CreditCard, Wallet, TrendingUp, RefreshCw, Database, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useLanguage } from '@/hooks/useLanguage';
import { format } from 'date-fns';

interface AdminDashboardProps {
  onBack: () => void;
}

interface Stats {
  totalUsers: number;
  totalTransactions: number;
  totalAccounts: number;
  totalCategories: number;
}

export function AdminDashboard({ onBack }: AdminDashboardProps) {
  const { isAdminOrDeveloper, loading: roleLoading } = useUserRoles();
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalTransactions: 0, totalAccounts: 0, totalCategories: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Note: These queries will only return data the user has access to via RLS
      // For full admin access, you'd need to use service role in edge functions
      
      const [transactionsRes, accountsRes, categoriesRes, rolesRes] = await Promise.all([
        supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('accounts').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*'),
        supabase.from('user_roles').select('*'),
      ]);

      setTransactions(transactionsRes.data || []);
      setAccounts(accountsRes.data || []);
      setUserRoles(rolesRes.data || []);

      setStats({
        totalUsers: new Set((transactionsRes.data || []).map(t => t.user_id)).size,
        totalTransactions: transactionsRes.data?.length || 0,
        totalAccounts: accountsRes.data?.length || 0,
        totalCategories: categoriesRes.data?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminOrDeveloper) {
      fetchData();
    }
  }, [isAdminOrDeveloper]);

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdminOrDeveloper) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Shield className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="text-muted-foreground mb-4">คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้</p>
        <Button onClick={onBack}>กลับหน้าหลัก</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Database className="h-5 w-5" />
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">Developer Mode</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Accounts</p>
                  <p className="text-2xl font-bold">{stats.totalAccounts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Categories</p>
                  <p className="text-2xl font-bold">{stats.totalCategories}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
            <TabsTrigger value="transactions" className="flex-1">Transactions</TabsTrigger>
            <TabsTrigger value="accounts" className="flex-1">Accounts</TabsTrigger>
            <TabsTrigger value="roles" className="flex-1">Roles</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>ภาพรวมระบบ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-xl font-bold text-green-500">
                        ฿{transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Total Expenses</p>
                      <p className="text-xl font-bold text-red-500">
                        ฿{transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>รายการธุรกรรมล่าสุด (100 รายการ)</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-sm">
                            {format(new Date(tx.date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={tx.type === 'income' ? 'default' : 'destructive'}>
                              {tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {tx.description || '-'}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${tx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                            {tx.type === 'income' ? '+' : '-'}฿{Number(tx.amount).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounts" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>บัญชีทั้งหมด</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((acc) => (
                        <TableRow key={acc.id}>
                          <TableCell className="font-medium">{acc.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{acc.type}</Badge>
                          </TableCell>
                          <TableCell>{acc.currency}</TableCell>
                          <TableCell className="text-right">
                            ฿{Number(acc.balance || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>User Roles</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userRoles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            ยังไม่มี user roles - กรุณาเพิ่มผ่าน Supabase Dashboard
                          </TableCell>
                        </TableRow>
                      ) : (
                        userRoles.map((role) => (
                          <TableRow key={role.id}>
                            <TableCell className="font-mono text-xs">{role.user_id}</TableCell>
                            <TableCell>
                              <Badge variant={role.role === 'admin' ? 'default' : role.role === 'developer' ? 'secondary' : 'outline'}>
                                {role.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(role.created_at), 'dd/MM/yyyy HH:mm')}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
