import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const expense = await prisma.expense.findUnique({
    where: { id: params.id },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      approvalActions: {
        include: { approver: { select: { id: true, name: true } } },
        orderBy: { stepOrder: "asc" },
      },
      receipt: true,
      adminOverrideBy: { select: { id: true, name: true } },
    },
  })

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 })
  }

  return NextResponse.json(expense)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { status } = body

  const expense = await prisma.expense.findUnique({
    where: { id: params.id },
  })

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 })
  }

  const updated = await prisma.expense.update({
    where: { id: params.id },
    data: { status },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const expense = await prisma.expense.findUnique({
    where: { id: params.id },
  })

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 })
  }

  if (expense.employeeId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.expense.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
