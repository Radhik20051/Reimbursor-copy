import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rules = await prisma.approvalRule.findMany({
      where: { companyId: session.user.companyId },
      include: {
        specificApprover: {
          select: { id: true, name: true },
        },
        steps: {
          include: {
            approver: {
              select: { id: true, name: true, role: true },
            },
          },
          orderBy: { stepOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error('Get approval rules error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const stepSchema = z.object({
  approverId: z.string(),
  stepOrder: z.number(),
  isRequired: z.boolean().optional(),
});

const createRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  isManagerApprover: z.boolean().optional(),
  approveThreshold: z.number().optional().nullable(),
  ruleType: z.enum(['SEQUENTIAL', 'PERCENTAGE', 'SPECIFIC_APPROVER', 'HYBRID']),
  percentageRequired: z.number().min(1).max(100).optional().nullable(),
  specificApproverId: z.string().optional().nullable(),
  steps: z.array(stepSchema),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createRuleSchema.parse(body);

    let ruleType = validatedData.ruleType;

    if (validatedData.ruleType === 'SEQUENTIAL' && validatedData.percentageRequired) {
      ruleType = 'HYBRID';
    } else if (validatedData.ruleType === 'SEQUENTIAL' && validatedData.specificApproverId) {
      ruleType = 'HYBRID';
    }

    const rule = await prisma.approvalRule.create({
      data: {
        companyId: session.user.companyId,
        name: validatedData.name,
        description: validatedData.description,
        isManagerApprover: validatedData.isManagerApprover || false,
        approveThreshold: validatedData.approveThreshold,
        ruleType,
        percentageRequired: validatedData.percentageRequired,
        specificApproverId: validatedData.specificApproverId,
        steps: {
          create: validatedData.steps.map((step) => ({
            approverId: step.approverId,
            stepOrder: step.stepOrder,
            isRequired: step.isRequired !== false,
          })),
        },
      },
      include: {
        steps: {
          include: {
            approver: {
              select: { id: true, name: true, role: true },
            },
          },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Create approval rule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, description, isManagerApprover, approveThreshold, ruleType, percentageRequired, specificApproverId, steps } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    const existingRule = await prisma.approvalRule.findUnique({
      where: { id },
    });

    if (!existingRule || existingRule.companyId !== session.user.companyId) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    let finalRuleType = ruleType;

    if (ruleType === 'SEQUENTIAL' && percentageRequired) {
      finalRuleType = 'HYBRID';
    } else if (ruleType === 'SEQUENTIAL' && specificApproverId) {
      finalRuleType = 'HYBRID';
    }

    await prisma.approvalStep.deleteMany({
      where: { ruleId: id },
    });

    const rule = await prisma.approvalRule.update({
      where: { id },
      data: {
        name,
        description,
        isManagerApprover,
        approveThreshold,
        ruleType: finalRuleType,
        percentageRequired,
        specificApproverId,
        steps: {
          create: steps.map((step: { approverId: string; stepOrder: number; isRequired?: boolean }) => ({
            approverId: step.approverId,
            stepOrder: step.stepOrder,
            isRequired: step.isRequired !== false,
          })),
        },
      },
      include: {
        steps: {
          include: {
            approver: {
              select: { id: true, name: true, role: true },
            },
          },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error('Update approval rule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    await prisma.approvalRule.delete({ where: { id } });

    return NextResponse.json({ message: 'Rule deleted' });
  } catch (error) {
    console.error('Delete approval rule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
