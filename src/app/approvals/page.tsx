'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Bell, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface ApprovalAction {
  id: string;
  expenseId: string;
  stepOrder: number;
  action: string;
  expense: {
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
      email: string;
    };
  };
}

export default function ApprovalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [approvals, setApprovals] = useState<ApprovalAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [selectedExpense, setSelectedExpense] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user.role === 'EMPLOYEE') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user) {
      fetchApprovals();
    }
  }, [session]);

  const fetchApprovals = async () => {
    try {
      const response = await fetch('/api/approvals');
      const data = await response.json();
      if (Array.isArray(data)) {
        setApprovals(data);
      } else {
        setApprovals([]);
      }
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (expenseId: string, action: 'APPROVED' | 'REJECTED') => {
    setSelectedExpense(expenseId);
    setSelectedAction(action);
    setDialogOpen(true);
  };

  const submitAction = async () => {
    if (!selectedExpense || !selectedAction) return;

    setActionLoading(selectedExpense);

    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: selectedExpense,
          action: selectedAction,
          comment,
        }),
      });

      if (response.ok) {
        setApprovals(approvals.filter(a => a.expenseId !== selectedExpense));
        setDialogOpen(false);
        setComment('');
        setSelectedExpense(null);
        setSelectedAction(null);
      }
    } catch (error) {
      console.error('Failed to submit action:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session || session.user.role === 'EMPLOYEE') {
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
                <Link href="/expenses" className="text-gray-500 hover:text-gray-900">
                  Expenses
                </Link>
                <Link href="/approvals" className="text-gray-900 font-medium">
                  Approvals
                </Link>
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
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Pending Approvals</h2>
          <p className="text-muted-foreground">Review and approve expense requests</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Expenses Awaiting Your Approval
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Approval Subject</TableHead>
                  <TableHead>Request Time</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Request Status</TableHead>
                  <TableHead>Total amount / {session.user.companyCurrency}</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                      <p className="text-lg font-medium">All caught up!</p>
                      <p className="text-muted-foreground">No pending approvals at the moment</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  approvals.map((approval) => (
                    <TableRow key={approval.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{approval.expense.description}</p>
                          <p className="text-xs text-muted-foreground">
                            by {approval.expense.employee.name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(approval.expense.createdAt), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{approval.expense.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="warning">Waiting Approval</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {approval.expense.convertedAmount} {session.user.companyCurrency}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleAction(approval.expenseId, 'APPROVED')}
                                disabled={actionLoading === approval.expenseId}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Approve Expense</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to approve this expense? You can add an optional comment.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                <Textarea
                                  placeholder="Add a comment (optional)"
                                  value={comment}
                                  onChange={(e) => setComment(e.target.value)}
                                />
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button
                                  onClick={submitAction}
                                  disabled={actionLoading === selectedExpense}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {actionLoading === selectedExpense && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  )}
                                  Approve
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleAction(approval.expenseId, 'REJECTED')}
                                disabled={actionLoading === approval.expenseId}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Reject Expense</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to reject this expense? Please provide a reason.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                <Textarea
                                  placeholder="Reason for rejection (required)"
                                  value={comment}
                                  onChange={(e) => setComment(e.target.value)}
                                />
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={submitAction}
                                  disabled={actionLoading === selectedExpense || !comment}
                                >
                                  {actionLoading === selectedExpense && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  )}
                                  Reject
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
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
