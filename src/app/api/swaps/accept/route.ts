import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const AcceptSwapSchema = z.object({
  swapRequestId: z.string().uuid(),
});

export const POST = requireAuth(async (user, request: NextRequest) => {
  try {
    const body = await request.json();
    const { swapRequestId } = AcceptSwapSchema.parse(body);

    // Get the swap request
    const swapRequest = await prisma.swapRequest.findUnique({
      where: { id: swapRequestId },
      include: {
        assignment: {
          include: {
            screening: true,
            user: true,
          },
        },
      },
    });

    if (!swapRequest) {
      return NextResponse.json(
        { success: false, error: 'Swap request not found' },
        { status: 404 }
      );
    }

    if (swapRequest.status !== 'open') {
      return NextResponse.json(
        { success: false, error: 'Swap request is no longer open' },
        { status: 409 }
      );
    }

    // Check if user is the assigned person (can accept the swap)
    if (swapRequest.assignment.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only accept swaps for your own assignments' },
        { status: 403 }
      );
    }

    // Update swap request status
    const updatedSwapRequest = await prisma.swapRequest.update({
      where: { id: swapRequestId },
      data: {
        status: 'accepted',
        decidedAt: new Date(),
        decidedBy: user.id,
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

    // TODO: Implement actual assignment swap logic
    // For now, we'll just mark it as accepted

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'swap_accepted',
        entity: 'swap_request',
        entityId: swapRequestId,
        data: {
          assignmentId: swapRequest.assignmentId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedSwapRequest,
    });
  } catch (error) {
    console.error('Accept swap error:', error);
    
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

