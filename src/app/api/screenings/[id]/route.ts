import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAnyRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

export const DELETE = requireAuth(async (user, request: NextRequest, { params }: { params: { id: string } }) => {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ success: false, error: 'Screening ID is required' }, { status: 400 });
  }

  try {
    // Check if screening exists
    const existingScreening = await prisma.screening.findUnique({
      where: { id },
      include: { 
        film: true,
        assignments: true,
        availabilities: true,
      },
    });

    if (!existingScreening) {
      return NextResponse.json({ success: false, error: 'Screening not found' }, { status: 404 });
    }

    // Store data for audit log before deletion
    const screeningData = {
      filmTitle: existingScreening.film.title,
      startsAt: existingScreening.startsAt,
      endsAt: existingScreening.endsAt,
      location: existingScreening.location,
      assignmentsCount: existingScreening.assignments.length,
      availabilitiesCount: existingScreening.availabilities.length,
    };

    // Delete all related records first (cascading deletes should handle this, but being explicit)
    // Delete assignments
    await prisma.assignment.deleteMany({
      where: { screeningId: id },
    });

    // Delete availabilities
    await prisma.availability.deleteMany({
      where: { screeningId: id },
    });

    // Delete the screening
    await prisma.screening.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'DELETE_SCREENING',
        entity: 'Screening',
        entityId: id,
        data: screeningData,
      },
    });

    return NextResponse.json({ success: true, message: 'Screening deleted successfully' });
  } catch (error) {
    console.error('Error deleting screening:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete screening' },
      { status: 500 }
    );
  }
});

const UpdateScreeningSchema = z.object({
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  location: z.string().optional(),
});

export const PATCH = requireAnyRole(['PROGRAMMA', 'ADMIN'])(async (user, request: NextRequest, { params }: { params: { id: string } }) => {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ success: false, error: 'Screening ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { startsAt, endsAt, location } = UpdateScreeningSchema.parse(body);

    // Ensure screening exists
    const existing = await prisma.screening.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Screening not found' }, { status: 404 });
    }

    // Basic validation: if both provided ensure chronological order
    if (startsAt && endsAt) {
      const s = new Date(startsAt);
      const e = new Date(endsAt);
      if (!(e > s)) {
        return NextResponse.json({ success: false, error: 'End time must be after start time' }, { status: 400 });
      }
    }

    const updated = await prisma.screening.update({
      where: { id },
      data: {
        ...(startsAt && { startsAt: new Date(startsAt) }),
        ...(endsAt && { endsAt: new Date(endsAt) }),
        ...(typeof location !== 'undefined' && { location }),
      },
      include: { film: true },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'UPDATE_SCREENING',
        entity: 'Screening',
        entityId: id,
        data: { startsAt, endsAt, location },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating screening:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to update screening' }, { status: 500 });
  }
});
