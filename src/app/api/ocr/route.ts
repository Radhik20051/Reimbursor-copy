import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

interface OcrResult {
  amount?: number
  currency?: string
  date?: string
  vendor?: string
  confidence: number
}

function mockOcrProcessing(_imageUrl: string): OcrResult {
  const mockAmounts = [25.50, 125.00, 45.75, 200.00, 89.99]
  const mockCurrencies = ["USD", "EUR", "GBP"]
  const mockVendors = ["Amazon", "Uber", "Starbucks", "Delta Airlines", "Marriott"]
  
  const randomAmount = mockAmounts[Math.floor(Math.random() * mockAmounts.length)]
  const randomCurrency = mockCurrencies[Math.floor(Math.random() * mockCurrencies.length)]
  const randomVendor = mockVendors[Math.floor(Math.random() * mockVendors.length)]
  
  const today = new Date()
  const randomDaysAgo = Math.floor(Math.random() * 30)
  const expenseDate = new Date(today)
  expenseDate.setDate(expenseDate.getDate() - randomDaysAgo)

  return {
    amount: randomAmount,
    currency: randomCurrency,
    date: expenseDate.toISOString().split("T")[0],
    vendor: randomVendor,
    confidence: 0.85 + Math.random() * 0.1,
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { receiptId } = body

    if (!receiptId || typeof receiptId !== "string") {
      return NextResponse.json({ error: "Receipt ID is required" }, { status: 400 })
    }

    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: { expense: true },
    })

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 })
    }

    if (receipt.expense.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (receipt.expense.employeeId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (receipt.ocrProcessed) {
      return NextResponse.json({
        message: "Receipt already processed",
        ocrData: receipt.ocrData,
      })
    }

    const ocrResult = mockOcrProcessing(receipt.url)

    const updatedReceipt = await prisma.receipt.update({
      where: { id: receiptId },
      data: {
        ocrData: ocrResult as unknown as object,
        ocrProcessed: true,
      },
    })

    return NextResponse.json({
      message: "OCR processing complete",
      ocrData: updatedReceipt.ocrData,
    })
  } catch (error) {
    console.error("OCR processing error:", error)
    return NextResponse.json(
      { error: "Failed to process receipt" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const receiptId = searchParams.get("receiptId")

  if (!receiptId) {
    return NextResponse.json({ error: "Receipt ID is required" }, { status: 400 })
  }

  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: { expense: true },
  })

  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 })
  }

  if (receipt.expense.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!receipt.ocrProcessed) {
    return NextResponse.json({
      message: "Receipt not yet processed",
      ocrProcessed: false,
    })
  }

  return NextResponse.json({
    receiptId: receipt.id,
    ocrData: receipt.ocrData,
    ocrProcessed: receipt.ocrProcessed,
  })
}
