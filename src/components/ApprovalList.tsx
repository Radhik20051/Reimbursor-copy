"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ExpenseAmountCell } from "@/components/ExpenseAmountCell"

interface ApprovalAction {
  id: string
  action: string
  stepOrder: number
  approver: { id: string; name: string }
}

interface Expense {
  id: string
  description: string
  category: string
  date: string
  submittedAmount: number
  submittedCurrency: string
  convertedAmount: number
  status: string
  employee: { id: string; name: string; email: string }
  approvalActions: ApprovalAction[]
}

interface ApprovalListProps {
  approvals: Expense[]
  companyCurrency: string
  viewerRole: "ADMIN" | "MANAGER" | "EMPLOYEE"
}

export function ApprovalList({ approvals, companyCurrency, viewerRole }: ApprovalListProps) {
  const router = useRouter()
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)

  const handleApprove = async (expenseId: string) => {
    setLoading(true)
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenseId, action: "APPROVED", comment }),
      })

      if (res.ok) {
        router.refresh()
        setSelectedExpense(null)
        setComment("")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (expenseId: string) => {
    setLoading(true)
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenseId, action: "REJECTED", comment }),
      })

      if (res.ok) {
        router.refresh()
        setSelectedExpense(null)
        setComment("")
      }
    } finally {
      setLoading(false)
    }
  }

  if (approvals.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">No pending approvals</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Pending Approvals</h2>
        {approvals.map((expense) => (
          <Card
            key={expense.id}
            className={`cursor-pointer hover:bg-accent/50 transition-colors ${
              selectedExpense?.id === expense.id ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelectedExpense(expense)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{expense.description}</CardTitle>
                <Badge variant="warning">{expense.status}</Badge>
              </div>
              <CardDescription>
                Submitted by {expense.employee.name} on{" "}
                {new Date(expense.date).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExpenseAmountCell
                convertedAmount={expense.convertedAmount}
                companyCurrency={companyCurrency}
                submittedAmount={expense.submittedAmount}
                submittedCurrency={expense.submittedCurrency}
                viewerRole={viewerRole}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedExpense && (
        <Card className="sticky top-4 h-fit">
          <CardHeader>
            <CardTitle>Review Expense</CardTitle>
            <CardDescription>{selectedExpense.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Employee</p>
                <p className="font-medium">{selectedExpense.employee.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Category</p>
                <p className="font-medium">{selectedExpense.category}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">
                  {new Date(selectedExpense.date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium">{selectedExpense.status}</p>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground mb-2">Amount</p>
              <ExpenseAmountCell
                convertedAmount={selectedExpense.convertedAmount}
                companyCurrency={companyCurrency}
                submittedAmount={selectedExpense.submittedAmount}
                submittedCurrency={selectedExpense.submittedCurrency}
                viewerRole={viewerRole}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Comment (optional)</label>
              <Textarea
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <Button
                variant="success"
                className="flex-1"
                onClick={() => handleApprove(selectedExpense.id)}
                disabled={loading}
              >
                {loading ? "Processing..." : "Approve"}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleReject(selectedExpense.id)}
                disabled={loading}
              >
                {loading ? "Processing..." : "Reject"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
