import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get('id');

    if (expenseId) {
      const expense = await prisma.expense.findUnique({
        where: { id: expenseId },
        include: {
          employee: {
            select: { id: true, name: true, email: true },
          },
          approvalActions: {
            include: {
              approver: {
                select: { id: true, name: true, role: true },
              },
            },
            orderBy: { stepOrder: 'asc' },
          },
        },
      });

      if (!expense) {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
      }

      if (expense.employeeId !== session.user.id && session.user.role === 'EMPLOYEE') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      return NextResponse.json(expense);
    }

    const expenses = await prisma.expense.findMany({
      where: session.user.role === 'EMPLOYEE' 
        ? { employeeId: session.user.id }
        : { companyId: session.user.companyId },
      include: {
        employee: {
          select: { id: true, name: true, email: true },
        },
        approvalActions: {
          include: {
            approver: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const createExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  paidBy: z.string().optional(),
  submittedAmount: z.number().positive('Amount must be positive'),
  submittedCurrency: z.string().min(3, 'Currency is required'),
  convertedAmount: z.number(),
  conversionRate: z.number(),
  date: z.string(),
  remarks: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createExpenseSchema.parse(body);

    let receiptId: string | undefined;

    if (body.receiptData) {
      const receipt = await prisma.receipt.create({
        data: {
          fileData: Buffer.from(body.receiptData, 'base64'),
          mimeType: body.receiptMimeType || 'image/jpeg',
        },
      });
      receiptId = receipt.id;
    }

    const employee = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        manager: {
          select: { id: true, name: true },
        },
      },
    });

    const rules = await prisma.approvalRule.findMany({
      where: {
        companyId: session.user.companyId,
        OR: [
          { approveThreshold: null },
          { approveThreshold: { lte: validatedData.convertedAmount } },
        ],
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

    let selectedRule = null;
    let maxThreshold = -1;

    for (const rule of rules) {
      if (rule.approveThreshold && rule.approveThreshold.gt(maxThreshold)) {
        selectedRule = rule;
        maxThreshold = Number(rule.approveThreshold);
      } else if (!rule.approveThreshold && maxThreshold < 0) {
        selectedRule = rule;
      }
    }

    const expense = await prisma.expense.create({
      data: {
        employeeId: session.user.id,
        companyId: session.user.companyId,
        description: validatedData.description,
        category: validatedData.category,
        date: new Date(validatedData.date),
        remarks: validatedData.remarks,
        submittedAmount: validatedData.submittedAmount,
        submittedCurrency: validatedData.submittedCurrency,
        convertedAmount: validatedData.convertedAmount,
        conversionRate: validatedData.conversionRate,
        status: 'PENDING',
        currentApprovalStep: 0,
        receiptId,
      },
    });

    const approvers: { approverId: string; stepOrder: number }[] = [];

    const shouldIncludeManager = 
      employee?.isManagerApprover || 
      selectedRule?.isManagerApprover;

    if (shouldIncludeManager && employee?.managerId) {
      approvers.push({
        approverId: employee.managerId,
        stepOrder: 0,
      });
    }

    if (selectedRule) {
      for (const step of selectedRule.steps) {
        approvers.push({
          approverId: step.approverId,
          stepOrder: step.stepOrder,
        });
      }
    }

    if (approvers.length === 0 && employee?.managerId) {
      approvers.push({
        approverId: employee.managerId,
        stepOrder: 0,
      });
    }

    for (const approver of approvers) {
      await prisma.approvalAction.create({
        data: {
          expenseId: expense.id,
          approverId: approver.approverId,
          stepOrder: approver.stepOrder,
          action: 'PENDING',
        },
      });
    }

    if (approvers.length > 0) {
      const firstApprover = approvers.find(a => a.stepOrder === 0) || approvers[0];
      await prisma.notification.create({
        data: {
          userId: firstApprover.approverId,
          message: `New expense "${validatedData.description}" requires your approval`,
          expenseId: expense.id,
        },
      });
    }

    const fullExpense = await prisma.expense.findUnique({
      where: { id: expense.id },
      include: {
        employee: {
          select: { id: true, name: true, email: true },
        },
        approvalActions: {
          include: {
            approver: {
              select: { id: true, name: true, role: true },
            },
          },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    return NextResponse.json(fullExpense, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Create expense error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, status } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const expense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    if (session.user.role !== 'ADMIN' && expense.employeeId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error('Update expense error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
