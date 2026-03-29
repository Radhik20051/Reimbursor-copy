import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'EMPLOYEE') {
      return NextResponse.json([]);
    }

    const pendingApprovals = await prisma.approvalAction.findMany({
      where: {
        approverId: session.user.id,
        action: 'PENDING',
        expense: {
          status: 'PENDING',
        },
      },
      include: {
        expense: {
          include: {
            employee: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(pendingApprovals);
  } catch (error) {
    console.error('Get approvals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'EMPLOYEE') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { expenseId, action, comment } = await request.json();

    if (!expenseId || !action) {
      return NextResponse.json({ error: 'Expense ID and action are required' }, { status: 400 });
    }

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        employee: true,
        approvalActions: {
          include: {
            approver: true,
          },
          orderBy: { stepOrder: 'asc' },
        },
        company: true,
      },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const currentAction = expense.approvalActions.find(
      a => a.approverId === session.user.id && a.action === 'PENDING'
    );

    if (!currentAction) {
      return NextResponse.json({ error: 'No pending approval action found' }, { status: 400 });
    }

    await prisma.approvalAction.update({
      where: { id: currentAction.id },
      data: {
        action,
        comment,
        actedAt: new Date(),
      },
    });

    const rules = await prisma.approvalRule.findMany({
      where: { companyId: expense.companyId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    const rule = rules[0];
    let finalStatus: 'APPROVED' | 'REJECTED' | null = null;
    let notifyUserId: string | null = null;

    if (action === 'REJECTED') {
      finalStatus = 'REJECTED';
      notifyUserId = expense.employeeId;
    } else if (action === 'APPROVED') {
      if (!rule) {
        finalStatus = 'APPROVED';
        notifyUserId = expense.employeeId;
      } else {
        const ruleType = rule.ruleType;

        if (ruleType === 'SEQUENTIAL' || ruleType === 'HYBRID') {
          const currentStep = expense.currentApprovalStep;
          const nextActions = expense.approvalActions.filter(a => a.stepOrder > currentStep);

          if (nextActions.length > 0) {
            const nextStep = Math.min(...nextActions.map(a => a.stepOrder));
            await prisma.expense.update({
              where: { id: expenseId },
              data: { currentApprovalStep: nextStep },
            });

            const nextApprover = nextActions.find(a => a.stepOrder === nextStep);
            if (nextApprover) {
              notifyUserId = nextApprover.approverId;
            }
          } else {
            finalStatus = 'APPROVED';
            notifyUserId = expense.employeeId;
          }
        }

        if (ruleType === 'PERCENTAGE' || ruleType === 'HYBRID') {
          const approvedCount = expense.approvalActions.filter(a => a.action === 'APPROVED').length + 1;
          const totalCount = expense.approvalActions.length;
          const approvalPercentage = (approvedCount / totalCount) * 100;

          if (rule.percentageRequired && approvalPercentage >= rule.percentageRequired) {
            finalStatus = 'APPROVED';
            notifyUserId = expense.employeeId;
          }
        }

        if ((ruleType === 'SPECIFIC_APPROVER' || ruleType === 'HYBRID') && rule.specificApproverId) {
          if (session.user.id === rule.specificApproverId) {
            finalStatus = 'APPROVED';
            notifyUserId = expense.employeeId;
          }
        }

        if (ruleType === 'SPECIFIC_APPROVER' && !rule.specificApproverId) {
          const allApproved = expense.approvalActions.every(a => a.action === 'APPROVED');
          if (allApproved) {
            finalStatus = 'APPROVED';
            notifyUserId = expense.employeeId;
          }
        }

        if (!finalStatus) {
          const remainingRequired = rule.percentageRequired 
            ? Math.ceil((rule.percentageRequired / 100) * expense.approvalActions.length) - 
              expense.approvalActions.filter(a => a.action === 'APPROVED').length
            : 1;
          const remainingPending = expense.approvalActions.filter(a => a.action === 'PENDING').length - 1;

          if (remainingPending < remainingRequired) {
            finalStatus = 'REJECTED';
            notifyUserId = expense.employeeId;
          }
        }
      }
    }

    if (finalStatus) {
      await prisma.expense.update({
        where: { id: expenseId },
        data: { status: finalStatus },
      });
    }

    if (notifyUserId) {
      const statusMessage = finalStatus === 'APPROVED' ? 'approved' : 'rejected';
      await prisma.notification.create({
        data: {
          userId: notifyUserId,
          message: `Expense "${expense.description}" has been ${statusMessage}`,
          expenseId: expense.id,
        },
      });
    }

    const updatedExpense = await prisma.expense.findUnique({
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

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error('Approval action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
