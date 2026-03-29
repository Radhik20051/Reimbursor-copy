import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AdminExpenseTable } from "@/components/AdminExpenseTable"

export default async function AdminExpensesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const expenses = await prisma.expense.findMany({
    where: { companyId: session.user.companyId },
    include: {
      employee: { select: { name: true, email: true } },
      approvalActions: {
        include: { approver: { select: { name: true } } },
        orderBy: { stepOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { currency: true },
  })

  const employees = await prisma.user.findMany({
    where: { companyId: session.user.companyId },
    select: { id: true, name: true, email: true },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">All Expenses — Admin View</h1>
        <p className="text-muted-foreground">
          View and override all expenses in your company
        </p>
      </div>

      <AdminExpenseTable
        expenses={expenses.map((e) => ({
          id: e.id,
          description: e.description,
          category: e.category,
          date: e.date.toISOString(),
          submittedAmount: Number(e.submittedAmount),
          submittedCurrency: e.submittedCurrency,
          convertedAmount: Number(e.convertedAmount),
          status: e.status,
          employee: e.employee,
          isAdminOverride: e.isAdminOverride,
          adminOverrideAt: e.adminOverrideAt?.toISOString() || null,
          adminOverrideComment: e.adminOverrideComment,
        }))}
        companyCurrency={company?.currency || "USD"}
        employees={employees}
      />
    </div>
  )
}
