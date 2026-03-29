import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { processExpenseWorkflow } from "@/lib/workflow"

const VALID_CATEGORIES = ["TRAVEL", "MEALS", "ACCOMMODATION", "TRANSPORTATION", "SUPPLIES", "EQUIPMENT", "OTHER"]
const VALID_CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "CAD", "AUD"]

function sanitizeString(str: string): string {
  return str.trim().slice(0, 500)
}

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

  if (!description || typeof description !== "string" || description.trim().length === 0) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 })
  }

  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
      { status: 400 }
    )
  }

  if (!date || isNaN(Date.parse(date))) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
  }

  const amount = parseFloat(submittedAmount)
  if (isNaN(amount) || amount <= 0 || amount > 1000000) {
    return NextResponse.json(
      { error: "Amount must be a positive number less than 1,000,000" },
      { status: 400 }
    )
  }

  if (!submittedCurrency || !VALID_CURRENCIES.includes(submittedCurrency)) {
    return NextResponse.json(
      { error: `Invalid currency. Must be one of: ${VALID_CURRENCIES.join(", ")}` },
      { status: 400 }
    )
  }

  const rate = parseFloat(exchangeRate)
  if (isNaN(rate) || rate <= 0 || rate > 1000) {
    return NextResponse.json(
      { error: "Exchange rate must be a positive number less than 1000" },
      { status: 400 }
    )
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
  })

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 })
  }

  const convertedAmount = amount * rate

  const expense = await prisma.expense.create({
    data: {
      description: sanitizeString(description),
      category,
      date: new Date(date),
      submittedAmount: amount,
      submittedCurrency,
      convertedAmount,
      exchangeRate: rate,
      companyId: session.user.companyId,
      employeeId: session.user.id,
      status: "DRAFT",
    },
  })

  const workflowResult = await processExpenseWorkflow(
    expense.id,
    session.user.id,
    convertedAmount,
    session.user.companyId
  )

  const updatedExpense = await prisma.expense.findUnique({
    where: { id: expense.id },
    include: {
      approvalActions: {
        include: { approver: { select: { id: true, name: true } } },
        orderBy: { stepOrder: "asc" },
      },
    },
  })

  return NextResponse.json({
    ...updatedExpense,
    workflowResult,
  }, { status: 201 })
}
