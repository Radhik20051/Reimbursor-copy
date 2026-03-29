import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ExpenseList } from "@/components/ExpenseList"

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Expenses</h1>
          <p className="text-muted-foreground">
            View and manage your submitted expenses
          </p>
        </div>
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
