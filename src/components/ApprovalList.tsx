"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ExpenseAmountCell } from "@/components/ExpenseAmountCell"
import { CheckCircle, XCircle, Clock, User, Calendar, Tag, FileText } from "lucide-react"

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
  const [filter, setFilter] = useState<"pending" | "all">("pending")

  const filteredApprovals = filter === "pending" 
    ? approvals.filter(a => a.status === "PENDING_APPROVAL" || a.status === "PENDING")
    : approvals

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

  if (filteredApprovals.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
            <p className="text-muted-foreground">No pending approvals at the moment</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-600" />
          Pending Approvals ({filteredApprovals.length})
        </h2>
        <div className="flex gap-2">
          <Button 
            variant={filter === "pending" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("pending")}
          >
            Pending
          </Button>
          <Button 
            variant={filter === "all" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          {filteredApprovals.map((expense) => (
            <Card
              key={expense.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedExpense?.id === expense.id 
                  ? "ring-2 ring-primary shadow-md" 
                  : "hover:border-primary/50"
              }`}
              onClick={() => setSelectedExpense(expense)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{expense.description}</CardTitle>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {expense.employee.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(expense.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Badge variant="warning">Pending</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="bg-muted px-2 py-1 rounded text-xs font-medium">
                      {expense.category}
                    </span>
                  </div>
                  <ExpenseAmountCell
                    convertedAmount={expense.convertedAmount}
                    companyCurrency={companyCurrency}
                    submittedAmount={expense.submittedAmount}
                    submittedCurrency={expense.submittedCurrency}
                    viewerRole={viewerRole}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selectedExpense ? (
            <Card className="sticky top-4 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Review Expense</CardTitle>
                </div>
                <CardDescription>{selectedExpense.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Employee</p>
                    <p className="font-medium flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {selectedExpense.employee.name}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Category</p>
                    <p className="font-medium flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {selectedExpense.category}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Date</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(selectedExpense.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                    <Badge variant="warning">Pending</Badge>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Amount</p>
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
                    placeholder="Add a comment for the employee..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="success"
                    className="gap-2"
                    onClick={() => handleApprove(selectedExpense.id)}
                    disabled={loading}
                  >
                    {loading ? (
                      "Processing..."
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => handleReject(selectedExpense.id)}
                    disabled={loading}
                  >
                    {loading ? (
                      "Processing..."
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        Reject
                      </>
                    )}
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setSelectedExpense(null)
                    setComment("")
                  }}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full min-h-[400px] flex items-center justify-center">
              <CardContent className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Select an expense to review</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
