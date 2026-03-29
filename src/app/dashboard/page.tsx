import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

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
    where: { employeeId: session.user.id, status: "PENDING" },
  })

  const approvedCount = await prisma.expense.count({
    where: { employeeId: session.user.id, status: "APPROVED" },
  })

  const rejectedCount = await prisma.expense.count({
    where: { employeeId: session.user.id, status: "REJECTED" },
  })

  let pendingApprovals = 0
  if (session.user.role === "MANAGER" || session.user.role === "ADMIN") {
    pendingApprovals = await prisma.approvalAction.count({
      where: { approverId: session.user.id, action: "PENDING" },
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {session.user.name}</h1>
          <p className="text-muted-foreground">
            Manage your expenses and approvals
          </p>
        </div>
        <Link href="/expenses/new">
          <Button>New Expense</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myExpenses.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
          </CardContent>
        </Card>
      </div>

      {(session.user.role === "MANAGER" || session.user.role === "ADMIN") && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pendingApprovals}
            </div>
            <Link href="/approvals" className="mt-2 inline-block">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {myExpenses.length === 0 ? (
            <p className="text-muted-foreground">No expenses yet</p>
          ) : (
            <div className="space-y-4">
              {myExpenses.map((expense) => (
                <Link
                  key={expense.id}
                  href={`/expenses/${expense.id}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{expense.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {expense.category} - {expense.submittedCurrency}{" "}
                      {expense.submittedAmount.toString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        expense.status === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : expense.status === "REJECTED"
                          ? "bg-red-100 text-red-800"
                          : expense.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {expense.status}
                    </span>
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
