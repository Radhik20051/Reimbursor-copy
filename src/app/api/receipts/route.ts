import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const expenseId = formData.get("expenseId") as string | null

    if (!expenseId) {
      return NextResponse.json({ error: "Expense ID is required" }, { status: 400 })
    }

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    })

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 })
    }

    if (expense.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (expense.employeeId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let url = ""
    let filename = "receipt"
    let mimeType = ""
    let size = 0

    if (file) {
      filename = file.name || "receipt"
      mimeType = file.type || "application/octet-stream"
      size = file.size || 0

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const base64 = buffer.toString("base64")
      const dataUrl = `data:${mimeType};base64,${base64}`
      url = dataUrl
    } else {
      url = ""
    }

    const existingReceipt = await prisma.receipt.findUnique({
      where: { expenseId },
    })

    let receipt
    if (existingReceipt) {
      receipt = await prisma.receipt.update({
        where: { id: existingReceipt.id },
        data: {
          url: url || existingReceipt.url,
          filename: filename !== "receipt" ? filename : existingReceipt.filename,
          mimeType: mimeType || existingReceipt.mimeType,
          size: size || existingReceipt.size,
        },
      })
    } else {
      receipt = await prisma.receipt.create({
        data: {
          expenseId,
          url: url || "placeholder",
          filename: filename,
          mimeType: mimeType,
          size: size,
        },
      })
    }

    return NextResponse.json({
      receiptId: receipt.id,
      url: receipt.url,
    })
  } catch (error) {
    console.error("Receipt upload error:", error)
    return NextResponse.json(
      { error: "Failed to upload receipt" },
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
  const expenseId = searchParams.get("expenseId")

  if (!expenseId) {
    return NextResponse.json({ error: "Expense ID is required" }, { status: 400 })
  }

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
  })

  if (!expense || expense.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const receipt = await prisma.receipt.findUnique({
    where: { expenseId },
  })

  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 })
  }

  return NextResponse.json({
    receiptId: receipt.id,
    url: receipt.url,
    filename: receipt.filename,
    ocrProcessed: receipt.ocrProcessed,
    ocrData: receipt.ocrData,
  })
}
