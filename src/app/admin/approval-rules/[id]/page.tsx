'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Plus, Loader2, Trash2, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';

interface User {
  id: string;
  name: string;
  role: string;
}

interface ApproverStep {
  id: string;
  approverId: string;
  stepOrder: number;
  isRequired: boolean;
}

interface ApprovalRule {
  id: string;
  name: string;
  description: string | null;
  isManagerApprover: boolean;
  approveThreshold: string | null;
  ruleType: string;
  percentageRequired: number | null;
  specificApproverId: string | null;
  steps: {
    id: string;
    stepOrder: number;
    isRequired: boolean;
    approver: {
      id: string;
      name: string;
      role: string;
    };
  }[];
}

export default function EditApprovalRulePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();

  const [rule, setRule] = useState<ApprovalRule | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isManagerApprover, setIsManagerApprover] = useState(false);
  const [approveThreshold, setApproveThreshold] = useState('');
  const [ruleType, setRuleType] = useState('SEQUENTIAL');
  const [percentageRequired, setPercentageRequired] = useState('');
  const [specificApproverId, setSpecificApproverId] = useState<string | null>(null);
  const [steps, setSteps] = useState<ApproverStep[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN' && params.id) {
      fetchData();
    }
  }, [session, params.id]);

  const fetchData = async () => {
    try {
      const [rulesRes, usersRes] = await Promise.all([
        fetch('/api/approval-rules'),
        fetch('/api/users'),
      ]);

      const rulesData = await rulesRes.json();
      const usersData = await usersRes.json();

      if (Array.isArray(rulesData)) {
        const foundRule = rulesData.find((r: ApprovalRule) => r.id === params.id);
        if (foundRule) {
          setRule(foundRule);
          setName(foundRule.name);
          setDescription(foundRule.description || '');
          setIsManagerApprover(foundRule.isManagerApprover);
          setApproveThreshold(foundRule.approveThreshold || '');
          setRuleType(foundRule.ruleType);
          setPercentageRequired(foundRule.percentageRequired?.toString() || '');
          setSpecificApproverId(foundRule.specificApproverId);
          setSteps(foundRule.steps.map((s: { id: string; approver: { id: string }; stepOrder: number; isRequired: boolean }) => ({
            id: s.id,
            approverId: s.approver.id,
            stepOrder: s.stepOrder,
            isRequired: s.isRequired,
          })));
        }
      }

      if (Array.isArray(usersData)) {
        setUsers(usersData.filter((u: User) => u.role === 'MANAGER' || u.role === 'ADMIN'));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    setSteps([
      ...steps,
      {
        id: `temp-${Date.now()}`,
        approverId: '',
        stepOrder: steps.length + 1,
        isRequired: true,
      },
    ]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps.map((step, i) => ({ ...step, stepOrder: i + 1 })));
  };

  const updateStep = (index: number, field: string, value: string | boolean) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;

    const temp = newSteps[index];
    newSteps[index] = { ...newSteps[targetIndex], stepOrder: index + 1 };
    newSteps[targetIndex] = { ...temp, stepOrder: targetIndex + 1 };
    setSteps(newSteps);
  };

  const handleSubmit = async () => {
    setError('');

    if (!name) {
      setError('Rule name is required');
      return;
    }

    if (steps.length === 0) {
      setError('At least one approver is required');
      return;
    }

    if (steps.some(step => !step.approverId)) {
      setError('All approvers must be selected');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/approval-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rule?.id,
          name,
          description,
          isManagerApprover,
          approveThreshold: approveThreshold ? parseFloat(approveThreshold) : null,
          ruleType,
          percentageRequired: percentageRequired ? parseInt(percentageRequired) : null,
          specificApproverId,
          steps: steps.map((step, index) => ({
            approverId: step.approverId,
            stepOrder: index + 1,
            isRequired: step.isRequired,
          })),
        }),
      });

      if (response.ok) {
        router.push('/admin/approval-rules');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update rule');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session || session.user.role !== 'ADMIN' || !rule) {
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Edit Approval Rule</h2>
          <p className="text-muted-foreground">Update the expense approval workflow</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center mb-6">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Rule Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Rule Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Standard Expense Approval"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold">Approval Threshold ({session.user.companyCurrency})</Label>
                <Input
                  id="threshold"
                  type="number"
                  step="0.01"
                  value={approveThreshold}
                  onChange={(e) => setApproveThreshold(e.target.value)}
                  placeholder="Leave empty for no threshold"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Manager Approver</Label>
                  <p className="text-sm text-muted-foreground">
                    Auto-insert employee&apos;s manager as first approver
                  </p>
                </div>
                <Switch checked={isManagerApprover} onCheckedChange={setIsManagerApprover} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approval Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ruleType">Rule Type</Label>
                <Select value={ruleType} onValueChange={setRuleType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEQUENTIAL">Sequential (all must approve)</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage (X% must approve)</SelectItem>
                    <SelectItem value="SPECIFIC_APPROVER">Specific Approver</SelectItem>
                    <SelectItem value="HYBRID">Hybrid (both conditions)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(ruleType === 'PERCENTAGE' || ruleType === 'HYBRID') && (
                <div className="space-y-2">
                  <Label htmlFor="percentage">Minimum Approval Percentage</Label>
                  <Input
                    id="percentage"
                    type="number"
                    min="1"
                    max="100"
                    value={percentageRequired}
                    onChange={(e) => setPercentageRequired(e.target.value)}
                    placeholder="e.g., 50"
                  />
                </div>
              )}

              {(ruleType === 'SPECIFIC_APPROVER' || ruleType === 'HYBRID') && (
                <div className="space-y-2">
                  <Label htmlFor="specificApprover">Specific Approver</Label>
                  <Select value={specificApproverId || ''} onValueChange={setSpecificApproverId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select approver" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Approval Sequence</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addStep}>
                <Plus className="h-4 w-4 mr-1" />
                Add Approver
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {steps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No approvers added yet</p>
                <p className="text-sm">Click &quot;Add Approver&quot; to add approval steps</p>
              </div>
            ) : (
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center space-x-4 bg-slate-50 p-4 rounded-lg">
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm font-medium text-muted-foreground">
                        Step {index + 1}
                      </span>
                      <div className="flex space-x-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveStep(index, 'up')}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveStep(index, 'down')}
                          disabled={index === steps.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <Select
                      value={step.approverId}
                      onValueChange={(value) => updateStep(index, 'approverId', value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select approver" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={step.isRequired}
                        onCheckedChange={(checked) => updateStep(index, 'isRequired', checked)}
                      />
                      <span className="text-sm text-muted-foreground">Required</span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4 mt-6">
          <Link href="/admin/approval-rules">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </main>
    </div>
  );
}
