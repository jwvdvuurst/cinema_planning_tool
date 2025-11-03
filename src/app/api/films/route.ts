import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAnyRole } from '@/lib/auth';

const CreateFilmSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  runtime: z.union([z.number().int().min(1), z.string().transform((val) => parseInt(val))]).optional(),
});

export const GET = requireAnyRole(['PROGRAMMA', 'ADMIN'])(async (user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';

    const films = await prisma.film.findMany({
      where: includeArchived ? {} : { 
        NOT: {
          archived: true
        }
      },
      include: {
        screenings: {
          orderBy: {
            startsAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: films,
    });
  } catch (error) {
    console.error('Get films error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = requireAnyRole(['PROGRAMMA', 'ADMIN'])(async (user, request: NextRequest) => {
  try {
    const body = await request.json();
    const { title, notes, runtime } = CreateFilmSchema.parse(body);

    const film = await prisma.film.create({
      data: {
        title,
        notes,
        runtime,
      },
    });

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'CREATE_FILM',
        entity: 'Film',
        entityId: film.id,
        data: {
          title,
          notes,
          runtime,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: film,
    });
  } catch (error) {
    console.error('Create film error:', error);
    
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

