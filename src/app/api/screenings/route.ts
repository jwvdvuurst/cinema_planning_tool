import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAnyRole } from '@/lib/auth';

const CreateScreeningSchema = z.object({
  filmId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    
    // Build where clause based on parameters
    const whereClause: any = {};
    
    if (startParam && endParam) {
      // When date range is specified, use it but ensure we don't go too far in the past
      const startDate = new Date(startParam);
      const endDate = new Date(endParam);
      const now = new Date();
      
      // If start date is in the past, use current time instead
      const effectiveStartDate = startDate < now ? now : startDate;
      
      whereClause.startsAt = {
        gte: effectiveStartDate,
        lte: endDate,
      };
    } else if (startParam) {
      // When only start date is specified, ensure it's not in the past
      const startDate = new Date(startParam);
      const now = new Date();
      const effectiveStartDate = startDate < now ? now : startDate;
      
      whereClause.startsAt = {
        gte: effectiveStartDate,
      };
    } else {
      // Default: only future screenings
      whereClause.startsAt = {
        gte: new Date(),
      };
    }

    // Get real screenings from database
    const screenings = await prisma.screening.findMany({
      where: whereClause,
      include: {
        film: true,
        assignments: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        startsAt: 'asc',
      },
      take: startParam && endParam ? undefined : 10, // No limit if date range specified
    });

    // Transform the data to match the expected format
    const formattedScreenings = screenings.map(screening => ({
      id: screening.id,
      startsAt: screening.startsAt.toISOString(),
      endsAt: screening.endsAt.toISOString(),
      location: screening.location || 'TBD',
      film: {
        title: screening.film.title,
      },
      assignments: screening.assignments.map(assignment => ({
        role: assignment.role,
        user: {
          id: assignment.user.id,
          name: assignment.user.name,
        },
      })),
    }));

    return NextResponse.json({
      success: true,
      data: formattedScreenings,
    });
  } catch (error) {
    console.error('Get screenings error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
};

export const POST = requireAnyRole(['PROGRAMMA', 'ADMIN'])(async (user, request: NextRequest) => {
  try {
    const body = await request.json();
    const { filmId, startsAt, endsAt, location, notes } = CreateScreeningSchema.parse(body);

    const screening = await prisma.screening.create({
      data: {
        filmId,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        location,
        notes,
      },
      include: {
        film: true,
      },
    });

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'CREATE_SCREENING',
        entity: 'Screening',
        entityId: screening.id,
        data: {
          filmId,
          startsAt,
          endsAt,
          location,
          notes,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: screening,
    });
  } catch (error) {
    console.error('Create screening error:', error);
    
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

