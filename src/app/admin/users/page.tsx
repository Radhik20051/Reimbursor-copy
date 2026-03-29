'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, UserPlus, Key, Loader2, Check, AlertCircle } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isManagerApprover: boolean;
  manager: {
    id: string;
    name: string;
  } | null;
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('EMPLOYEE');
  const [newUserManager, setNewUserManager] = useState<string | null>(null);
  const [newUserManagerApprover, setNewUserManagerApprover] = useState(false);

  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [session]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (Array.isArray(data)) {
        setUsers(data);
        setManagers(data.filter((u: User) => u.role === 'MANAGER' || u.role === 'ADMIN'));
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    setError('');
    setFormLoading(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          role: newUserRole,
          managerId: newUserRole === 'EMPLOYEE' ? newUserManager : null,
          isManagerApprover: newUserManagerApprover,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTempPassword(data.tempPassword);
        setCreateDialogOpen(false);
        setPasswordDialogOpen(true);
        resetForm();
        fetchUsers();
      } else {
        setError(data.error || 'Failed to create user');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSendPassword = async (userId: string) => {
    try {
      const response = await fetch('/api/users/send-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (response.ok) {
        setTempPassword(data.tempPassword);
        setPasswordDialogOpen(true);
      } else {
        setError(data.error || 'Failed to send password');
      }
    } catch {
      setError('An unexpected error occurred');
    }
  };

  const handleToggleManagerApprover = async (userId: string, currentValue: boolean) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          name: user.name,
          role: user.role,
          managerId: user.manager?.id,
          isManagerApprover: !currentValue,
        }),
      });

      fetchUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const resetForm = () => {
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('EMPLOYEE');
    setNewUserManager(null);
    setNewUserManagerApprover(false);
    setError('');
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
                <Link href="/admin/users" className="text-gray-900 font-medium">
                  Users
                </Link>
                <Link href="/admin/approval-rules" className="text-gray-500 hover:text-gray-900">
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
            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
            <p className="text-muted-foreground">Manage company users and their roles</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new employee or manager to your company
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUserRole} onValueChange={setNewUserRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newUserRole === 'EMPLOYEE' && (
                  <div className="space-y-2">
                    <Label htmlFor="manager">Assigned Manager</Label>
                    <Select value={newUserManager || ''} onValueChange={setNewUserManager}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {managers.map((manager) => (
                          <SelectItem key={manager.id} value={manager.id}>
                            {manager.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Manager Approver</Label>
                    <p className="text-sm text-muted-foreground">
                      Auto-insert manager in approval flow
                    </p>
                  </div>
                  <Switch
                    checked={newUserManagerApprover}
                    onCheckedChange={setNewUserManagerApprover}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUser} disabled={formLoading}>
                  {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Manager Approver</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === 'ADMIN' ? 'default' : user.role === 'MANAGER' ? 'secondary' : 'outline'
                        }
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.manager?.name || '-'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={user.isManagerApprover}
                        onCheckedChange={() => handleToggleManagerApprover(user.id, user.isManagerApprover)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendPassword(user.id)}
                      >
                        <Key className="h-4 w-4 mr-1" />
                        Send Password
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Password Generated</DialogTitle>
              <DialogDescription>
                Share this temporary password securely with the user. They will be prompted to change it on first login.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mt-4">
              <p className="font-semibold mb-2 flex items-center">
                <Check className="h-5 w-5 mr-2" />
                Temporary Password:
              </p>
              <code className="bg-white px-3 py-2 rounded border block font-mono text-lg">
                {tempPassword}
              </code>
              <p className="text-sm mt-2 text-green-700">
                This password will only be shown once. Please share it securely.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setPasswordDialogOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
