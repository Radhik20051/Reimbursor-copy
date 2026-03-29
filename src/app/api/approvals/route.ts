import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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

  return NextResponse.json({
    approvals: pendingApprovals,
    companyCurrency: company?.currency || "USD",
  })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { expenseId, action, comment } = body

  const approvalAction = await prisma.approvalAction.findFirst({
    where: {
      expenseId,
      approverId: session.user.id,
      action: "PENDING",
    },
    include: { expense: true },
  })

  if (!approvalAction) {
    return NextResponse.json(
      { error: "No pending approval found" },
      { status: 404 }
    )
  }

  await prisma.$transaction(async (tx) => {
    await tx.approvalAction.update({
      where: { id: approvalAction.id },
      data: {
        action,
        comment,
        actedAt: new Date(),
      },
    })

    const expense = approvalAction.expense

    if (action === "APPROVED") {
      const allApproved = await tx.approvalAction.count({
        where: {
          expenseId,
          action: { in: ["PENDING", "APPROVED"] },
        },
      })

      const totalActions = await tx.approvalAction.count({
        where: { expenseId },
      })

      if (allApproved === totalActions) {
        await tx.expense.update({
          where: { id: expenseId },
          data: { status: "APPROVED" },
        })
      }
    } else if (action === "REJECTED") {
      await tx.expense.update({
        where: { id: expenseId },
        data: {
          status: "REJECTED",
          currentApprovalStep: approvalAction.stepOrder,
        },
      })
    }

    await tx.notification.create({
      data: {
        userId: expense.employeeId,
        expenseId,
        message: `Your expense "${expense.description}" was ${action === "APPROVED" ? "approved" : "rejected"} by ${session.user.name}.`,
      },
    })
  })

  return NextResponse.json({ success: true })
}
