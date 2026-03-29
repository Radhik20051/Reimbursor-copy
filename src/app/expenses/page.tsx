'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Bell, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface Expense {
  id: string;
  description: string;
  category: string;
  date: string;
  submittedAmount: string;
  submittedCurrency: string;
  convertedAmount: string;
  status: string;
  createdAt: string;
  employee: {
    name: string;
  };
}

export default function ExpensesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchExpenses();
    }
  }, [session]);

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses');
      const data = await response.json();
      if (Array.isArray(data)) {
        setExpenses(data);
      } else {
        setExpenses([]);
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!session) {
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Expenses</h2>
            <p className="text-muted-foreground">Track and manage your expense submissions</p>
          </div>
          <Link href="/expenses/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Expense
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Status Overview
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
            <Progress value={50} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Draft</span>
              <span>Waiting Approval</span>
              <span>Approved</span>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No expenses found</p>
                        <p className="text-sm">Submit your first expense to get started</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{expense.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">
                            {expense.submittedAmount} {expense.submittedCurrency}
                          </span>
                          {expense.submittedCurrency !== session.user.companyCurrency && (
                            <p className="text-xs text-muted-foreground">
                              ≈ {expense.convertedAmount} {session.user.companyCurrency}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(expense.status)}</TableCell>
                      <TableCell>
                        <Link href={`/expenses/${expense.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
