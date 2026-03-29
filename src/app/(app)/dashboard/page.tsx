import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { prisma } from "@/lib/prisma"
import { DollarSign, Clock, CheckCircle, XCircle, FileText, PlusCircle } from "lucide-react"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const myExpenses = await prisma.expense.findMany({
    where: { employeeId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  const pendingCount = await prisma.expense.count({
    where: { 
      employeeId: session.user.id, 
      status: { in: ["PENDING", "PENDING_APPROVAL"] } 
    },
  })

  const approvedCount = await prisma.expense.count({
    where: { employeeId: session.user.id, status: { in: ["APPROVED", "AUTO_APPROVED"] } },
  })

  const rejectedCount = await prisma.expense.count({
    where: { employeeId: session.user.id, status: "REJECTED" },
  })

  const totalAmount = await prisma.expense.aggregate({
    where: { employeeId: session.user.id, status: { in: ["APPROVED", "AUTO_APPROVED"] } },
    _sum: { convertedAmount: true },
  })

  let pendingApprovals = 0
  if (session.user.role === "MANAGER" || session.user.role === "ADMIN") {
    pendingApprovals = await prisma.approvalAction.count({
      where: { approverId: session.user.id, action: "PENDING" },
    })
  }

  const stats = [
    {
      title: "Pending",
      value: pendingCount,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
    },
    {
      title: "Approved",
      value: approvedCount,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      title: "Rejected",
      value: rejectedCount,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    {
      title: "Total Reimbursed",
      value: `$${(Number(totalAmount._sum.convertedAmount) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
  ]

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "warning" | "success" | "destructive" | "gray" | "secondary"; label: string }> = {
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
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {session.user.name}</h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your expenses
          </p>
        </div>
        <Link href="/expenses/new">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            New Expense
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className={`border-l-4 ${stat.borderColor}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(session.user.role === "MANAGER" || session.user.role === "ADMIN") && pendingApprovals > 0 && (
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg">Pending Your Approval</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600 mb-3">
              {pendingApprovals} expense{pendingApprovals > 1 ? "s" : ""} waiting
            </p>
            <Link href="/approvals">
              <Button variant="outline" className="gap-2">
                Review Expenses
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              Recent Expenses
            </CardTitle>
          </div>
          <Link href="/expenses">
            <Button variant="ghost" size="sm" className="gap-2">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {myExpenses.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No expenses yet</p>
              <Link href="/expenses/new">
                <Button className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Create your first expense
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myExpenses.map((expense) => (
                <Link
                  key={expense.id}
                  href={`/expenses/${expense.id}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="font-medium">{expense.description}</span>
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
                      {expense.submittedCurrency !== "USD" && (
                        <p className="text-xs text-muted-foreground">
                          ≈ ${Number(expense.convertedAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
                        </p>
                      )}
                    </div>
                    {getStatusBadge(expense.status)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
