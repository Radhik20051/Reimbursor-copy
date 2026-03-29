import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { currency: true },
  })

  const expenses = await prisma.expense.findMany({
    where: { companyId: session.user.companyId },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      approvalActions: {
        include: { approver: { select: { id: true, name: true } } },
        orderBy: { stepOrder: "asc" },
      },
      receipt: { select: { id: true, url: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    expenses,
    companyCurrency: company?.currency || "USD",
  })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { description, category, date, submittedAmount, submittedCurrency, exchangeRate } = body

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
  })

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 })
  }

  const convertedAmount = submittedAmount * exchangeRate

  const expense = await prisma.expense.create({
    data: {
      description,
      category,
      date: new Date(date),
      submittedAmount,
      submittedCurrency,
      convertedAmount,
      exchangeRate,
      companyId: session.user.companyId,
      employeeId: session.user.id,
      status: "DRAFT",
    },
  })

  return NextResponse.json(expense, { status: 201 })
}
