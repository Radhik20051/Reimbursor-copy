"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
}

interface ExpenseListProps {
  expenses: Expense[]
  companyCurrency: string
  viewerRole: "ADMIN" | "MANAGER" | "EMPLOYEE"
}

export function ExpenseList({ expenses, companyCurrency, viewerRole }: ExpenseListProps) {
  const getStatusBadge = (status: string, isAdminOverride: boolean) => {
    if (isAdminOverride) {
      return (
        <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800">
          Admin Overridden
        </span>
      )
    }

    const statusClasses: Record<string, string> = {
      DRAFT: "bg-gray-100 text-gray-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
    }

    return (
      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${statusClasses[status] || statusClasses.DRAFT}`}>
        {status}
      </span>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Expenses</CardTitle>
        <CardDescription>View and manage your submitted expenses</CardDescription>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="text-muted-foreground">No expenses yet</p>
        ) : (
          <div className="space-y-4">
            {expenses.map((expense) => (
              <Link
                key={expense.id}
                href={`/expenses/${expense.id}`}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{expense.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {expense.category} - {new Date(expense.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right flex items-center gap-4">
                  <ExpenseAmountCell
                    convertedAmount={expense.convertedAmount}
                    companyCurrency={companyCurrency}
                    submittedAmount={expense.submittedAmount}
                    submittedCurrency={expense.submittedCurrency}
                    viewerRole={viewerRole}
                  />
                  {getStatusBadge(expense.status, expense.isAdminOverride)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
