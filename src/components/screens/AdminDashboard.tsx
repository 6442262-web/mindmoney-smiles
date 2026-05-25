import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Users, 
  CreditCard, 
  Wallet, 
  TrendingUp, 
  RefreshCw, 
  Database, 
  Shield,
  MessageSquare,
  Ticket,
  UserCheck,
  UserPlus,
  Activity,
  Ghost
} from 'lucide-react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAdminStats } from '@/hooks/useAdminStats';
import { format } from 'date-fns';

interface AdminDashboardProps {
  onBack: () => void;
}

export function AdminDashboard({ onBack }: AdminDashboardProps) {
  const { isAdminOrDeveloper, loading: roleLoading } = useUserRoles();
  const { data, loading, fetchStats } = useAdminStats();

  useEffect(() => {
    if (isAdminOrDeveloper) {
      fetchStats();
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

  const stats = data?.stats;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Database className="h-5 w-5" />
                Developer Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">ภาพรวมระบบทั้งหมด</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* User Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">ผู้ใช้ทั้งหมด</p>
                  <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">ใหม่ (30 วัน)</p>
                  <p className="text-2xl font-bold">{stats?.newUsersLast30Days || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Active (7 วัน)</p>
                  <p className="text-2xl font-bold">{stats?.activeUsersLast7Days || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-500/10 to-gray-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Ghost className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Guest Users</p>
                  <p className="text-2xl font-bold">{stats?.guestUsers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Transactions</p>
                  <p className="text-xl font-bold">{stats?.totalTransactions || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Accounts</p>
                  <p className="text-xl font-bold">{stats?.totalAccounts || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Feedback รอ</p>
                  <p className="text-xl font-bold">{stats?.pendingFeedback || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Invite Codes</p>
                  <p className="text-xl font-bold">{stats?.activeInviteCodes || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-green-500/10">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">รายรับทั้งหมด</p>
              <p className="text-2xl font-bold text-green-600">
                ฿{(stats?.totalIncome || 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-red-500/10">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">รายจ่ายทั้งหมด</p>
              <p className="text-2xl font-bold text-red-600">
                ฿{(stats?.totalExpense || 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Tabs */}
        <Tabs defaultValue="users">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="invites">Invites</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  ผู้ใช้ทั้งหมด ({data?.users?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>UID</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-center">รายการ</TableHead>
                        <TableHead className="text-right">ยอด</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.users?.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm truncate max-w-[150px]">
                                {user.is_anonymous ? '👻 Guest' : user.full_name}
                              </span>
                              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {user.email || 'Anonymous'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                user.role === 'admin' ? 'default' : 
                                user.role === 'developer' ? 'secondary' : 
                                'outline'
                              }
                              className="text-xs"
                            >
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm">{user.transaction_count}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end text-xs">
                              <span className="text-green-600">+{user.total_income.toLocaleString()}</span>
                              <span className="text-red-600">-{user.total_expense.toLocaleString()}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Feedback ล่าสุด
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {data?.feedback?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      ยังไม่มี feedback
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data?.feedback?.map((fb) => (
                        <div key={fb.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant={fb.status === 'pending' ? 'destructive' : fb.status === 'reviewed' ? 'secondary' : 'default'}>
                              {fb.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(fb.created_at), 'dd/MM/yy HH:mm')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{fb.subject}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{fb.message}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">{fb.type}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  User Roles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-center">
                    <p className="text-2xl font-bold">{stats?.adminCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Admins</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50 text-center">
                    <p className="text-2xl font-bold">{stats?.developerCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Developers</p>
                  </div>
                </div>
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.userRoles?.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell className="font-mono text-xs truncate max-w-[120px]">
                            {role.user_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={role.role === 'admin' ? 'default' : 'secondary'}
                            >
                              {role.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {format(new Date(role.created_at), 'dd/MM/yy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invites" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  Invite Codes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-center">Uses</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.inviteCodes?.map((code) => (
                        <TableRow key={code.id}>
                          <TableCell className="font-mono text-xs">
                            {code.code}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{code.role}</Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {code.current_uses}/{code.max_uses || '∞'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={code.is_active ? 'default' : 'secondary'}>
                              {code.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
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
