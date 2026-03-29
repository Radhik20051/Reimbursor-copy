"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, ArrowRight } from "lucide-react"

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
}

interface ExpenseListProps {
  expenses: Expense[]
  companyCurrency: string
  viewerRole: "ADMIN" | "MANAGER" | "EMPLOYEE"
}

export function ExpenseList({ expenses, companyCurrency, viewerRole }: ExpenseListProps) {
  const getStatusBadge = (status: string, isAdminOverride: boolean) => {
    if (isAdminOverride) {
      return <Badge variant="secondary">Admin Overridden</Badge>
    }

    const statusConfig: Record<string, { variant: "warning" | "success" | "destructive" | "gray"; label: string }> = {
      DRAFT: { variant: "gray", label: "Draft" },
      PENDING_APPROVAL: { variant: "warning", label: "Pending Approval" },
      PENDING: { variant: "warning", label: "Pending" },
      APPROVED: { variant: "success", label: "Approved" },
      AUTO_APPROVED: { variant: "success", label: "Auto Approved" },
      REJECTED: { variant: "destructive", label: "Rejected" },
    }
    const config = statusConfig[status] || { variant: "gray", label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Expenses</CardTitle>
        <CardDescription>View and manage your submitted expenses</CardDescription>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No expenses yet</p>
            <Link href="/expenses/new">
              <ButtonVariant href="/expenses/new">Create your first expense</ButtonVariant>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <Link
                key={expense.id}
                href={`/expenses/${expense.id}`}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="font-medium group-hover:text-primary transition-colors">
                      {expense.description}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {expense.category} &middot; {new Date(expense.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">
                      {expense.submittedCurrency} {Number(expense.submittedAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    {expense.submittedCurrency !== companyCurrency && (
                      <p className="text-xs text-muted-foreground">
                        ≈ ${Number(expense.convertedAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })} {companyCurrency}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(expense.status, expense.isAdminOverride)}
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ButtonVariant({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
    >
      {children}
    </Link>
  )
}
