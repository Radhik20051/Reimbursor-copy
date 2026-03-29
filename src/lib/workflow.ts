import { prisma } from "@/lib/prisma"

interface WorkflowResult {
  expenseId: string
  actionsCreated: number
  status: "PENDING_APPROVAL" | "AUTO_APPROVED"
}

export async function processExpenseWorkflow(
  expenseId: string,
  employeeId: string,
  convertedAmount: number,
  companyId: string
): Promise<WorkflowResult> {
  const applicableRules = await prisma.approvalRule.findMany({
    where: {
      companyId,
      minAmount: { lte: convertedAmount },
      OR: [
        { maxAmount: null },
        { maxAmount: { gte: convertedAmount } },
      ],
    },
    orderBy: { stepOrder: "asc" },
  })

  if (applicableRules.length === 0) {
    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: "PENDING_APPROVAL", currentApprovalStep: 0 },
    })
    return { expenseId, actionsCreated: 0, status: "PENDING_APPROVAL" }
  }

  const employee = await prisma.user.findUnique({
    where: { id: employeeId },
    include: { manager: true },
  })

  const approverIds: string[] = []

  for (const rule of applicableRules) {
    if (rule.isAutoApproved) {
      continue
    }

    if (rule.ruleType === "SPECIFIC" && rule.approverId) {
      approverIds.push(rule.approverId)
    } else if (rule.ruleType === "SPECIFIC" && rule.approverRole) {
      const roleApprovers = await prisma.user.findMany({
        where: {
          companyId,
          role: rule.approverRole,
        },
        select: { id: true },
      })
      approverIds.push(...roleApprovers.map((u) => u.id))
    } else if (rule.isManagerApproval && employee?.managerId) {
      approverIds.push(employee.managerId)
    } else if (!rule.isManagerApproval && rule.approverRole) {
      const roleApprovers = await prisma.user.findMany({
        where: {
          companyId,
          role: rule.approverRole,
        },
        select: { id: true },
      })
      approverIds.push(...roleApprovers.map((u) => u.id))
    }
  }

  const uniqueApproverIds = Array.from(new Set(approverIds))

  if (uniqueApproverIds.length === 0) {
    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: "PENDING_APPROVAL", currentApprovalStep: 0 },
    })
    return { expenseId, actionsCreated: 0, status: "PENDING_APPROVAL" }
  }

  const approvalActions = uniqueApproverIds.map((approverId, index) => ({
    expenseId,
    approverId,
    stepOrder: index + 1,
    action: "PENDING" as const,
  }))

  await prisma.approvalAction.createMany({
    data: approvalActions,
  })

  const shouldAutoApprove = applicableRules.some(
    (r) => r.isAutoApproved && (!r.autoApproveRole || r.autoApproveRole === employee?.role)
  )

  if (shouldAutoApprove) {
    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: "AUTO_APPROVED", currentApprovalStep: 0 },
    })
    return { expenseId, actionsCreated: uniqueApproverIds.length, status: "AUTO_APPROVED" }
  }

  await prisma.expense.update({
    where: { id: expenseId },
    data: { status: "PENDING_APPROVAL", currentApprovalStep: 1 },
  })

  return { expenseId, actionsCreated: uniqueApproverIds.length, status: "PENDING_APPROVAL" }
}
