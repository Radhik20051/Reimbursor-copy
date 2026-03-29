'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, DollarSign, FileText, CheckCircle, Clock, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    myExpenses: 0,
    approvedThisMonth: 0,
    totalReimbursed: 0,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      const [expensesRes, approvalsRes] = await Promise.all([
        fetch('/api/expenses'),
        fetch('/api/approvals'),
      ]);

      const expenses = await expensesRes.json();
      const approvals = await approvalsRes.json();

      setStats({
        pendingApprovals: approvals.length || 0,
        myExpenses: expenses.length || 0,
        approvedThisMonth: expenses.filter((e: { status: string }) => e.status === 'APPROVED').length || 0,
        totalReimbursed: expenses
          .filter((e: { status: string }) => e.status === 'APPROVED')
          .reduce((sum: number, e: { convertedAmount: string }) => sum + Number(e.convertedAmount), 0) || 0,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const role = session.user.role;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">Reimbursor</h1>
              <nav className="ml-10 flex items-center space-x-4">
                <Link href="/dashboard" className="text-gray-900 font-medium">
                  Dashboard
                </Link>
                <Link href="/expenses" className="text-gray-500 hover:text-gray-900">
                  Expenses
                </Link>
                {(role === 'MANAGER' || role === 'ADMIN') && (
                  <Link href="/approvals" className="text-gray-500 hover:text-gray-900">
                    Approvals
                  </Link>
                )}
                {role === 'ADMIN' && (
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
              <div className="flex items-center space-x-2">
                <div className="text-sm text-right">
                  <p className="font-medium">{session.user.name}</p>
                  <p className="text-muted-foreground text-xs">{role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {session.user.name}
          </h2>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your expenses today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">My Expenses</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.myExpenses}</div>
              <p className="text-xs text-muted-foreground">Total submitted</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">Awaiting your action</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Approved This Month</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approvedThisMonth}</div>
              <p className="text-xs text-muted-foreground">Approved expenses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Reimbursed</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {session.user.companyCurrency} {stats.totalReimbursed.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">In {session.user.companyCurrency}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/expenses/new">
                <Button className="w-full justify-between">
                  Submit New Expense
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/expenses">
                <Button variant="outline" className="w-full justify-between">
                  View My Expenses
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              {(role === 'MANAGER' || role === 'ADMIN') && (
                <Link href="/approvals">
                  <Button variant="outline" className="w-full justify-between">
                    Review Pending Approvals
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              {role === 'ADMIN' && (
                <>
                  <Link href="/admin/users">
                    <Button variant="outline" className="w-full justify-between">
                      Manage Users
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/admin/approval-rules">
                    <Button variant="outline" className="w-full justify-between">
                      Configure Approval Rules
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Company Name</span>
                <span className="font-medium">{session.user.companyName}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Base Currency</span>
                <Badge variant="secondary">{session.user.companyCurrency}</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Your Role</span>
                <Badge
                  variant={
                    role === 'ADMIN' ? 'default' : role === 'MANAGER' ? 'secondary' : 'outline'
                  }
                >
                  {role}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
