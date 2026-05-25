import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Trash2, CheckCircle, Clock, XCircle } from "lucide-react";
import { useRecurringExecutions } from "@/hooks/useRecurringExecutions";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RecurringExecutionHistoryProps {
  recurringTransactionId?: string;
}

export default function RecurringExecutionHistory({ recurringTransactionId }: RecurringExecutionHistoryProps) {
  const { executions, loading, deleteExecution } = useRecurringExecutions(recurringTransactionId);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'เสร็จสิ้น';
      case 'pending':
        return 'รอดำเนินการ';
      case 'failed':
        return 'ล้มเหลว';
      default:
        return status;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ประวัติการเกิดรายการ</CardTitle>
          <CardDescription>กำลังโหลด...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ประวัติการเกิดรายการประจำ</CardTitle>
        <CardDescription>
          {recurringTransactionId 
            ? "ประวัติการเกิดรายการประจำนี้" 
            : "ประวัติการเกิดรายการประจำทั้งหมด"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {executions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">ยังไม่มีประวัติการเกิดรายการ</p>
        ) : (
          executions.map((execution) => (
            <Card key={execution.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(execution.status || 'success')}
                      <Badge variant={getStatusVariant(execution.status || 'success')}>
                        {getStatusLabel(execution.status || 'success')}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(execution.execution_date), 'dd MMM yyyy', { locale: th })}
                    </div>

                    {execution.error_message && (
                      <p className="text-sm text-destructive">{execution.error_message}</p>
                    )}
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการลบประวัติ</AlertDialogTitle>
                        <AlertDialogDescription>
                          คุณแน่ใจหรือว่าต้องการลบประวัติการเกิดรายการนี้?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteExecution(execution.id)}>
                          ลบ
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}
