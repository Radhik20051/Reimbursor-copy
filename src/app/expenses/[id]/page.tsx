'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Bell, ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface ApprovalAction {
  id: string;
  stepOrder: number;
  action: string;
  comment: string | null;
  actedAt: string | null;
  approver: {
    id: string;
    name: string;
    role: string;
  };
}

interface Expense {
  id: string;
  description: string;
  category: string;
  date: string;
  remarks: string | null;
  submittedAmount: string;
  submittedCurrency: string;
  convertedAmount: string;
  conversionRate: string;
  status: string;
  createdAt: string;
  employee: {
    name: string;
    email: string;
  };
  approvalActions: ApprovalAction[];
}

export default function ExpenseDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user && params.id) {
      fetchExpense();
    }
  }, [session, params.id]);

  const fetchExpense = async () => {
    try {
      const response = await fetch(`/api/expenses?id=${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setExpense(data);
      } else {
        router.push('/expenses');
      }
    } catch (error) {
      console.error('Failed to fetch expense:', error);
      router.push('/expenses');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (expenseStatus: string) => {
    switch (expenseStatus) {
      case 'DRAFT':
        return <Badge variant="outline">Draft</Badge>;
      case 'PENDING':
        return <Badge variant="warning">Waiting Approval</Badge>;
      case 'APPROVED':
        return <Badge variant="success">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{expenseStatus}</Badge>;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'PENDING':
        return (
          <Badge variant="warning" className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="success" className="flex items-center">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive" className="flex items-center">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getProgressValue = (expenseStatus: string) => {
    switch (expenseStatus) {
      case 'DRAFT':
        return 0;
      case 'PENDING':
        return 50;
      case 'APPROVED':
        return 100;
      case 'REJECTED':
        return 100;
      default:
        return 0;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!session || !expense) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">Reimbursor</h1>
              <nav className="ml-10 flex items-center space-x-4">
                <Link href="/dashboard" className="text-gray-500 hover:text-gray-900">
                  Dashboard
                </Link>
                <Link href="/expenses" className="text-gray-900 font-medium">
                  Expenses
                </Link>
                {(session.user.role === 'MANAGER' || session.user.role === 'ADMIN') && (
                  <Link href="/approvals" className="text-gray-500 hover:text-gray-900">
                    Approvals
                  </Link>
                )}
                {session.user.role === 'ADMIN' && (
                  <>
                    <Link href="/admin/users" className="text-gray-500 hover:text-gray-900">
                      Users
                    </Link>
                    <Link href="/admin/approval-rules" className="text-gray-500 hover:text-gray-900">
                      Approval Rules
                    </Link>
                  </>
                )}
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/notifications">
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                </Button>
              </Link>
              <div className="text-sm">
                <p className="font-medium">{session.user.name}</p>
                <p className="text-muted-foreground text-xs">{session.user.role}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-6">
          <Link href="/expenses">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Expenses
            </Button>
          </Link>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Expense Details</h2>
          <p className="text-muted-foreground">View the details and approval status of your expense</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{expense.description}</span>
              {getStatusBadge(expense.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-gray-300 mr-2"></div>
                <span className="text-sm">Draft</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                <span className="text-sm">Waiting Approval</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm">Approved</span>
              </div>
            </div>
            <Progress value={getProgressValue(expense.status)} className="h-2" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Expense Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Category</span>
                <Badge variant="secondary">{expense.category}</Badge>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{format(new Date(expense.date), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Submitted Amount</span>
                <span className="font-medium">
                  {expense.submittedAmount} {expense.submittedCurrency}
                </span>
              </div>
              {expense.submittedCurrency !== session.user.companyCurrency && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Converted Amount</span>
                  <span className="font-medium">
                    {expense.convertedAmount} {session.user.companyCurrency}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Conversion Rate</span>
                <span className="font-medium">{parseFloat(expense.conversionRate).toFixed(6)}</span>
              </div>
              {expense.remarks && (
                <div className="pt-2">
                  <span className="text-muted-foreground block mb-2">Remarks</span>
                  <p className="text-sm bg-slate-50 p-3 rounded">{expense.remarks}</p>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Submitted</span>
                <span className="font-medium">{format(new Date(expense.createdAt), 'MMM d, yyyy h:mm a')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employee Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{expense.employee.name}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{expense.employee.email}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Approval Log</CardTitle>
          </CardHeader>
          <CardContent>
            {expense.approvalActions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No approval actions yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Step</TableHead>
                    <TableHead>Approver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expense.approvalActions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell className="font-medium">{action.stepOrder + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p>{action.approver.name}</p>
                          <p className="text-xs text-muted-foreground">{action.approver.role}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(action.action)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {action.comment || '-'}
                      </TableCell>
                      <TableCell>
                        {action.actedAt ? format(new Date(action.actedAt), 'MMM d, h:mm a') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
