import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ExpenseList } from "@/components/ExpenseList"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"

export default async function ExpensesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const expenses = await prisma.expense.findMany({
    where: { employeeId: session.user.id },
    include: {
      employee: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { currency: true },
  })

  const stats = {
    total: expenses.length,
    pending: expenses.filter(e => e.status === "PENDING_APPROVAL" || e.status === "PENDING").length,
    approved: expenses.filter(e => e.status === "APPROVED" || e.status === "AUTO_APPROVED").length,
    rejected: expenses.filter(e => e.status === "REJECTED").length,
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Expenses</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your submitted expenses
          </p>
        </div>
        <Link href="/expenses/new">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            New Expense
          </Button>
        </Link>
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{stats.total} total</span>
        <span className="text-yellow-600">{stats.pending} pending</span>
        <span className="text-green-600">{stats.approved} approved</span>
        <span className="text-red-600">{stats.rejected} rejected</span>
      </div>

      <ExpenseList
        expenses={expenses.map((e) => ({
          ...e,
          submittedAmount: Number(e.submittedAmount),
          convertedAmount: Number(e.convertedAmount),
          date: e.date.toISOString(),
        }))}
        companyCurrency={company?.currency || "USD"}
        viewerRole={session.user.role as "ADMIN" | "MANAGER" | "EMPLOYEE"}
      />
    </div>
  )
}
