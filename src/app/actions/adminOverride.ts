"use server"

import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function adminOverrideExpense(input: {
  expenseId: string
  action: "APPROVE" | "REJECT"
  comment?: string
}): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions)

  if (!session) {
    return { success: false, error: "Unauthorized" }
  }

  if (session.user.role !== "ADMIN") {
    return { success: false, error: "Forbidden — only admins can override" }
  }

  const expense = await prisma.expense.findUnique({
    where: { id: input.expenseId },
    include: {
      approvalActions: true,
      employee: true,
    },
  })

  if (!expense) {
    return { success: false, error: "Expense not found" }
  }

  if (expense.isAdminOverride) {
    return { success: false, error: "This expense has already been overridden" }
  }

  if (expense.status === "APPROVED" || expense.status === "REJECTED") {
    return { success: false, error: "Expense is already resolved" }
  }

  const newStatus = input.action === "APPROVE" ? "APPROVED" : "REJECTED"

  const pendingApprovers = expense.approvalActions
    .filter((a) => a.action === "PENDING")
    .map((a) => a.approverId)

  await prisma.$transaction(async (tx) => {
    await tx.approvalAction.updateMany({
      where: { expenseId: input.expenseId, action: "PENDING" },
      data: {
        action: newStatus as "APPROVED" | "REJECTED",
        comment: `Admin override by ${session.user.name}${input.comment ? ": " + input.comment : ""}`,
        actedAt: new Date(),
      },
    })

    await tx.expense.update({
      where: { id: input.expenseId },
      data: {
        status: newStatus as "APPROVED" | "REJECTED",
        isAdminOverride: true,
        adminOverrideById: session.user.id,
        adminOverrideAt: new Date(),
        adminOverrideComment: input.comment ?? null,
        currentApprovalStep: expense.approvalActions.length,
      },
    })

    await tx.notification.create({
      data: {
        userId: expense.employeeId,
        expenseId: expense.id,
        message: `Your expense "${expense.description}" was ${newStatus === "APPROVED" ? "approved" : "rejected"} by an admin override.`,
      },
    })

    for (const approverId of pendingApprovers) {
      await tx.notification.create({
        data: {
          userId: approverId,
          expenseId: expense.id,
          message: `The expense "${expense.description}" submitted by ${expense.employee.name} was overridden by an admin. Your approval action is no longer required.`,
        },
      })
    }
  })

  revalidatePath("/admin/expenses")
  revalidatePath("/approvals")
  revalidatePath(`/expenses/${input.expenseId}`)

  return { success: true }
}
