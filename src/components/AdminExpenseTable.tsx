"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AdminOverrideDialog } from "@/components/AdminOverrideDialog"
import { ExpenseAmountCell } from "@/components/ExpenseAmountCell"

interface Expense {
  id: string
  description: string
  category: string
  date: string
  submittedAmount: number
  submittedCurrency: string
  convertedAmount: number
  status: string
  employee: { name: string; email: string }
  isAdminOverride: boolean
  adminOverrideAt: string | null
  adminOverrideComment: string | null
}

interface AdminExpenseTableProps {
  expenses: Expense[]
  companyCurrency: string
  employees: { id: string; name: string; email: string }[]
}

export function AdminExpenseTable({ expenses, companyCurrency, employees }: AdminExpenseTableProps) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [employeeFilter, setEmployeeFilter] = useState<string>("ALL")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [overrideDialog, setOverrideDialog] = useState<{
    open: boolean
    expenseId: string
    expenseDescription: string
    action: "APPROVE" | "REJECT"
  }>({ open: false, expenseId: "", expenseDescription: "", action: "APPROVE" })

  const filteredExpenses = expenses.filter((expense) => {
    if (statusFilter !== "ALL" && expense.status !== statusFilter) return false
    if (employeeFilter !== "ALL" && expense.employee.email !== employeeFilter) return false
    if (dateFrom && new Date(expense.date) < new Date(dateFrom)) return false
    if (dateTo && new Date(expense.date) > new Date(dateTo)) return false
    return true
  })

  const getStatusBadge = (status: string, isAdminOverride: boolean) => {
    if (isAdminOverride) {
      return <Badge variant="secondary">Overridden</Badge>
    }

    const variants: Record<string, "default" | "warning" | "success" | "destructive" | "gray"> = {
      DRAFT: "gray",
      PENDING: "warning",
      APPROVED: "success",
      REJECTED: "destructive",
    }

    return <Badge variant={variants[status] || "gray"}>{status}</Badge>
  }

  const handleOverrideSuccess = () => {
    router.refresh()
  }

  const openApproveDialog = (expense: Expense) => {
    setOverrideDialog({
      open: true,
      expenseId: expense.id,
      expenseDescription: expense.description,
      action: "APPROVE",
    })
  }

  const openRejectDialog = (expense: Expense) => {
    setOverrideDialog({
      open: true,
      expenseId: expense.id,
      expenseDescription: expense.description,
      action: "REJECT",
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Expenses — Admin View</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Employees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.email} value={emp.email}>
                    {emp.name} ({emp.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="From"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />

            <Input
              type="date"
              placeholder="To"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Submitted Amount</TableHead>
                <TableHead>Total amount / Company&apos;s currency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Override</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">{expense.employee.name}</TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{expense.category}</TableCell>
                  <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {expense.submittedCurrency} {expense.submittedAmount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <ExpenseAmountCell
                      convertedAmount={expense.convertedAmount}
                      companyCurrency={companyCurrency}
                      submittedAmount={expense.submittedAmount}
                      submittedCurrency={expense.submittedCurrency}
                      viewerRole="ADMIN"
                    />
                  </TableCell>
                  <TableCell>{getStatusBadge(expense.status, expense.isAdminOverride)}</TableCell>
                  <TableCell>
                    {expense.isAdminOverride ? (
                      <span className="text-sm text-muted-foreground">Overridden</span>
                    ) : expense.status === "APPROVED" || expense.status === "REJECTED" ? (
                      <span className="text-sm text-muted-foreground">Resolved</span>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => openApproveDialog(expense)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openRejectDialog(expense)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdminOverrideDialog
        expenseId={overrideDialog.expenseId}
        expenseDescription={overrideDialog.expenseDescription}
        action={overrideDialog.action}
        open={overrideDialog.open}
        onClose={() => setOverrideDialog({ ...overrideDialog, open: false })}
        onSuccess={handleOverrideSuccess}
      />
    </>
  )
}
