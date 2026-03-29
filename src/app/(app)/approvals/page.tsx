import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ApprovalList } from "@/components/ApprovalList"
import { CheckCircle } from "lucide-react"

export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const pendingApprovals = await prisma.approvalAction.findMany({
    where: {
      approverId: session.user.id,
      action: "PENDING",
    },
    include: {
      expense: {
        include: {
          employee: { select: { id: true, name: true, email: true } },
          receipt: { select: { id: true, url: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { currency: true },
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pending Approvals</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve expense requests from your team
          </p>
        </div>
        {pendingApprovals.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-600" />
            {pendingApprovals.length} pending
          </div>
        )}
      </div>

      <ApprovalList
        approvals={pendingApprovals.map((a) => ({
          ...a.expense,
          submittedAmount: Number(a.expense.submittedAmount),
          convertedAmount: Number(a.expense.convertedAmount),
          date: a.expense.date.toISOString(),
          approvalActions: [],
        }))}
        companyCurrency={company?.currency || "USD"}
        viewerRole={session.user.role as "ADMIN" | "MANAGER"}
      />
    </div>
  )
}
