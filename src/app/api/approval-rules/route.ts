import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const rules = await prisma.approvalRule.findMany({
    where: { companyId: session.user.companyId },
    orderBy: [{ minAmount: "asc" }, { stepOrder: "asc" }],
  })

  return NextResponse.json({ rules })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const {
      name,
      description,
      minAmount,
      maxAmount,
      stepOrder,
      ruleType,
      requiredApprovers,
      isManagerApproval,
      approverRole,
      approverId,
      isAutoApproved,
      autoApproveRole,
    } = body

    if (!name || minAmount === undefined || stepOrder === undefined) {
      return NextResponse.json(
        { error: "Name, minAmount, and stepOrder are required" },
        { status: 400 }
      )
    }

    const amount = parseFloat(minAmount)
    if (isNaN(amount) || amount < 0) {
      return NextResponse.json(
        { error: "minAmount must be a positive number" },
        { status: 400 }
      )
    }

    if (maxAmount !== undefined && maxAmount !== null) {
      const max = parseFloat(maxAmount)
      if (isNaN(max) || max < amount) {
        return NextResponse.json(
          { error: "maxAmount must be greater than minAmount" },
          { status: 400 }
        )
      }
    }

    const validRuleTypes = ["SEQUENTIAL", "PERCENTAGE", "SPECIFIC", "HYBRID"]
    if (ruleType && !validRuleTypes.includes(ruleType)) {
      return NextResponse.json(
        { error: `Invalid ruleType. Must be one of: ${validRuleTypes.join(", ")}` },
        { status: 400 }
      )
    }

    if (approverId) {
      const approver = await prisma.user.findUnique({
        where: { id: approverId },
      })

      if (!approver || approver.companyId !== session.user.companyId) {
        return NextResponse.json(
          { error: "Invalid approver" },
          { status: 400 }
        )
      }
    }

    const existingRule = await prisma.approvalRule.findUnique({
      where: {
        companyId_stepOrder: {
          companyId: session.user.companyId,
          stepOrder,
        },
      },
    })

    if (existingRule) {
      return NextResponse.json(
        { error: "A rule with this stepOrder already exists" },
        { status: 400 }
      )
    }

    const rule = await prisma.approvalRule.create({
      data: {
        companyId: session.user.companyId,
        name,
        description,
        minAmount: amount,
        maxAmount: maxAmount ? parseFloat(maxAmount) : null,
        stepOrder,
        ruleType: ruleType || "SEQUENTIAL",
        requiredApprovers: requiredApprovers || "1",
        isManagerApproval: isManagerApproval || false,
        approverRole: approverRole || null,
        approverId: approverId || null,
        isAutoApproved: isAutoApproved || false,
        autoApproveRole: autoApproveRole || null,
      },
    })

    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    console.error("Create approval rule error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const {
      ruleId,
      name,
      description,
      minAmount,
      maxAmount,
      stepOrder,
      ruleType,
      requiredApprovers,
      isManagerApproval,
      approverRole,
      approverId,
      isAutoApproved,
      autoApproveRole,
    } = body

    if (!ruleId) {
      return NextResponse.json(
        { error: "Rule ID is required" },
        { status: 400 }
      )
    }

    const rule = await prisma.approvalRule.findUnique({
      where: { id: ruleId },
    })

    if (!rule || rule.companyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Rule not found" },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (minAmount !== undefined) updateData.minAmount = parseFloat(minAmount)
    if (maxAmount !== undefined) updateData.maxAmount = maxAmount ? parseFloat(maxAmount) : null
    if (stepOrder !== undefined) updateData.stepOrder = stepOrder
    if (ruleType !== undefined) updateData.ruleType = ruleType
    if (requiredApprovers !== undefined) updateData.requiredApprovers = requiredApprovers
    if (isManagerApproval !== undefined) updateData.isManagerApproval = isManagerApproval
    if (approverRole !== undefined) updateData.approverRole = approverRole
    if (approverId !== undefined) updateData.approverId = approverId
    if (isAutoApproved !== undefined) updateData.isAutoApproved = isAutoApproved
    if (autoApproveRole !== undefined) updateData.autoApproveRole = autoApproveRole

    const updated = await prisma.approvalRule.update({
      where: { id: ruleId },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Update approval rule error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const ruleId = searchParams.get("ruleId")

    if (!ruleId) {
      return NextResponse.json(
        { error: "Rule ID is required" },
        { status: 400 }
      )
    }

    const rule = await prisma.approvalRule.findUnique({
      where: { id: ruleId },
    })

    if (!rule || rule.companyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "Rule not found" },
        { status: 404 }
      )
    }

    await prisma.approvalRule.delete({
      where: { id: ruleId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete approval rule error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
