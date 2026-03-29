import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ApprovalList } from "@/components/ApprovalList"

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pending Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve expense requests from your team
        </p>
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
