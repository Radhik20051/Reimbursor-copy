import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

const VALID_ACTIONS = ["APPROVED", "REJECTED"]

function sanitizeString(str: string): string {
  return str.trim().slice(0, 500)
}

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

  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { expenseId, action, comment } = body

  if (!expenseId || typeof expenseId !== "string") {
    return NextResponse.json({ error: "Expense ID is required" }, { status: 400 })
  }

  if (!action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}` },
      { status: 400 }
    )
  }

  if (comment !== undefined && (typeof comment !== "string" || comment.length > 500)) {
    return NextResponse.json(
      { error: "Comment must be a string with maximum 500 characters" },
      { status: 400 }
    )
  }

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
        comment: comment ? sanitizeString(comment) : null,
        actedAt: new Date(),
      },
    })

    const expense = approvalAction.expense

    if (expense.companyId !== session.user.companyId) {
      throw new Error("Forbidden")
    }

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
