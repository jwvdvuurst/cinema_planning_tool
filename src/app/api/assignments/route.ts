import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAnyRole } from '@/lib/auth';
import { prisma } from '@/lib/db';

const CreateAssignmentSchema = z.object({
  screeningId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['TECHNIEK', 'ZAALWACHT']),
});

export const POST = requireAnyRole(['ADMIN', 'PROGRAMMA'])(async (user, request: NextRequest) => {
  try {
    const body = await request.json();
    const { screeningId, userId, role } = CreateAssignmentSchema.parse(body);

    // Check if screening exists
    const screening = await prisma.screening.findUnique({
      where: { id: screeningId },
    });

    if (!screening) {
      return NextResponse.json(
        { success: false, error: 'Screening not found' },
        { status: 404 }
      );
    }

    // Check if user exists and has the required role
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userRecord || !userRecord.active) {
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 404 }
      );
    }

    if (!userRecord.roles.includes(role)) {
      return NextResponse.json(
        { success: false, error: `User does not have ${role} role` },
        { status: 400 }
      );
    }

    // Check if user is already assigned to this screening in any role
    const existingScreeningAssignment = await prisma.assignment.findFirst({
      where: {
        screeningId,
        userId,
      },
    });

    if (existingScreeningAssignment) {
      return NextResponse.json(
        { success: false, error: `User is already assigned to this screening as ${existingScreeningAssignment.role}` },
        { status: 400 }
      );
    }

    // Check if we already have enough people for this role in this screening
    const roleAssignments = await prisma.assignment.findMany({
      where: {
        screeningId,
        role,
      },
    });

    if (roleAssignments.length >= 2) {
      return NextResponse.json(
        { success: false, error: `Already have maximum number of ${role} assignments (2) for this screening` },
        { status: 400 }
      );
    }

    // Create the assignment
    const assignment = await prisma.assignment.create({
      data: {
        screeningId,
        userId,
        role,
        source: 'manual',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'CREATE_ASSIGNMENT',
        entity: 'Assignment',
        entityId: assignment.id,
        data: {
          screeningId,
          userId,
          role,
          source: 'manual',
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: assignment,
      message: 'Assignment created successfully',
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create assignment' },
      { status: 500 }
    );
  }
});

// Bulk delete assignments (admin only)
const BulkDeleteSchema = z.object({
  screeningId: z.string().uuid().optional(),
  rangeStart: z.string().datetime().optional(),
  rangeEnd: z.string().datetime().optional(),
});

export const DELETE = requireAnyRole(['ADMIN'])(async (user, request: NextRequest) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { screeningId, rangeStart, rangeEnd } = BulkDeleteSchema.parse(body);

    if (!screeningId && !(rangeStart && rangeEnd)) {
      return NextResponse.json(
        { success: false, error: 'Provide either screeningId or rangeStart/rangeEnd' },
        { status: 400 }
      );
    }

    let deletedCount = 0;

    if (screeningId) {
      // Delete related swap requests first for this screening's assignments
      const assignments = await prisma.assignment.findMany({ where: { screeningId }, select: { id: true } });
      const ids = assignments.map(a => a.id);
      if (ids.length > 0) {
        await prisma.swapRequest.deleteMany({ where: { assignmentId: { in: ids } } });
      }
      const result = await prisma.assignment.deleteMany({ where: { screeningId } });
      deletedCount += result.count;
    } else if (rangeStart && rangeEnd) {
      // Fetch assignments in range to cascade delete swap requests
      const inRange = await prisma.assignment.findMany({
        where: {
          screening: {
            startsAt: {
              gte: new Date(rangeStart),
              lte: new Date(rangeEnd),
            },
          },
        },
        select: { id: true },
      });
      const ids = inRange.map(a => a.id);
      if (ids.length > 0) {
        await prisma.swapRequest.deleteMany({ where: { assignmentId: { in: ids } } });
        const result = await prisma.assignment.deleteMany({ where: { id: { in: ids } } });
        deletedCount += result.count;
      }
    }

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'BULK_DELETE_ASSIGNMENTS',
        entity: 'Assignment',
        entityId: 'bulk',
        data: { screeningId, rangeStart, rangeEnd, deletedCount },
      },
    });

    return NextResponse.json({ success: true, deleted: deletedCount });
  } catch (error) {
    console.error('Bulk delete assignments error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to bulk delete assignments' }, { status: 500 });
  }
});
