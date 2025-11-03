import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const RequestSwapSchema = z.object({
  assignmentId: z.string().uuid(),
});

export const POST = requireAuth(async (user, request: NextRequest) => {
  try {
    const body = await request.json();
    const { assignmentId } = RequestSwapSchema.parse(body);

    // Get the assignment
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        screening: true,
        user: true,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Check if user is the assigned person
    if (assignment.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only request swaps for your own assignments' },
        { status: 403 }
      );
    }

    // Check if there's already an open swap request for this assignment
    const existingRequest = await prisma.swapRequest.findFirst({
      where: {
        assignmentId,
        status: 'open',
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { success: false, error: 'There is already an open swap request for this assignment' },
        { status: 409 }
      );
    }

    // Create swap request
    const swapRequest = await prisma.swapRequest.create({
      data: {
        assignmentId,
        requesterId: user.id,
        status: 'open',
      },
      include: {
        assignment: {
          include: {
            screening: {
              include: {
                film: true,
              },
            },
            user: true,
          },
        },
      },
    });

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'swap_requested',
        entity: 'swap_request',
        entityId: swapRequest.id,
        data: {
          assignmentId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: swapRequest,
    });
  } catch (error) {
    console.error('Request swap error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

