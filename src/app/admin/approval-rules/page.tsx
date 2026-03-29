'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Plus, Loader2, Settings, Trash2 } from 'lucide-react';

interface ApprovalStep {
  id: string;
  stepOrder: number;
  approver: {
    id: string;
    name: string;
    role: string;
  };
}

interface ApprovalRule {
  id: string;
  name: string;
  description: string | null;
  isManagerApprover: boolean;
  approveThreshold: string | null;
  ruleType: string;
  percentageRequired: number | null;
  steps: ApprovalStep[];
  createdAt: string;
}

export default function AdminApprovalRulesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchRules();
    }
  }, [session]);

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/approval-rules');
      const data = await response.json();
      if (Array.isArray(data)) {
        setRules(data);
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      await fetch(`/api/approval-rules?id=${ruleId}`, { method: 'DELETE' });
      fetchRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const getRuleTypeBadge = (ruleType: string) => {
    switch (ruleType) {
      case 'SEQUENTIAL':
        return <Badge variant="secondary">Sequential</Badge>;
      case 'PERCENTAGE':
        return <Badge variant="default">Percentage</Badge>;
      case 'SPECIFIC_APPROVER':
        return <Badge variant="outline">Specific Approver</Badge>;
      case 'HYBRID':
        return <Badge variant="warning">Hybrid</Badge>;
      default:
        return <Badge variant="outline">{ruleType}</Badge>;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session || session.user.role !== 'ADMIN') {
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
                <Link href="/approvals" className="text-gray-500 hover:text-gray-900">
                  Approvals
                </Link>
                <Link href="/admin/users" className="text-gray-500 hover:text-gray-900">
                  Users
                </Link>
                <Link href="/admin/approval-rules" className="text-gray-900 font-medium">
                  Approval Rules
                </Link>
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
            <h2 className="text-2xl font-bold text-gray-900">Approval Rules</h2>
            <p className="text-muted-foreground">Configure how expenses get approved</p>
          </div>
          <Link href="/admin/approval-rules/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </Link>
        </div>

        {rules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No approval rules yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first approval rule to start managing expense workflows
              </p>
              <Link href="/admin/approval-rules/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center">
                        {rule.name}
                        <span className="ml-3">{getRuleTypeBadge(rule.ruleType)}</span>
                      </CardTitle>
                      {rule.description && (
                        <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Link href={`/admin/approval-rules/${rule.id}`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {rule.approveThreshold && (
                      <div className="bg-slate-50 p-3 rounded">
                        <p className="text-sm text-muted-foreground">Threshold</p>
                        <p className="font-medium">
                          {session.user.companyCurrency} {rule.approveThreshold}
                        </p>
                      </div>
                    )}
                    {rule.percentageRequired && (
                      <div className="bg-slate-50 p-3 rounded">
                        <p className="text-sm text-muted-foreground">Approval Percentage</p>
                        <p className="font-medium">{rule.percentageRequired}%</p>
                      </div>
                    )}
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="text-sm text-muted-foreground">Manager Approver</p>
                      <p className="font-medium">{rule.isManagerApprover ? 'Yes' : 'No'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Approval Sequence:</p>
                    <div className="flex items-center space-x-2 flex-wrap">
                      {rule.steps.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                            {step.approver.name}
                          </div>
                          {index < rule.steps.length - 1 && (
                            <div className="mx-2 text-muted-foreground">→</div>
                          )}
                        </div>
                      ))}
                      {rule.steps.length === 0 && (
                        <p className="text-sm text-muted-foreground">No approvers configured</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
