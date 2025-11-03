import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const DELETE = requireAnyRole(['ADMIN', 'PROGRAMMA'])(async (user, request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    // Check if assignment exists
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        screening: {
          include: {
            film: true,
          },
        },
        user: true,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Store data for audit log
    const assignmentData = {
      screeningId: assignment.screeningId,
      userId: assignment.userId,
      role: assignment.role,
      filmTitle: assignment.screening.film.title,
      screeningDate: assignment.screening.startsAt,
      userName: assignment.user.name,
    };

    // Delete the assignment
    await prisma.assignment.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'DELETE_ASSIGNMENT',
        entity: 'Assignment',
        entityId: id,
        data: assignmentData,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Assignment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete assignment' },
      { status: 500 }
    );
  }
});







