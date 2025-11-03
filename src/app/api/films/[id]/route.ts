import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const UpdateFilmSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  runtime: z.number().int().min(1).optional(),
});

export const PUT = requireAuth(async (user, request: NextRequest, { params }: { params: { id: string } }) => {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ success: false, error: 'Film ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { title, notes, runtime } = UpdateFilmSchema.parse(body);

    // Check if film exists
    const existingFilm = await prisma.film.findUnique({
      where: { id },
    });

    if (!existingFilm) {
      return NextResponse.json({ success: false, error: 'Film not found' }, { status: 404 });
    }

    // Update the film
    const updatedFilm = await prisma.film.update({
      where: { id },
      data: {
        title,
        notes,
        runtime,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'UPDATE_FILM',
        entity: 'Film',
        entityId: id,
        data: {
          filmTitle: title,
          filmNotes: notes,
          runtime,
          previousTitle: existingFilm.title,
          previousNotes: existingFilm.notes,
          previousRuntime: existingFilm.runtime,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedFilm,
    });
  } catch (error) {
    console.error('Error updating film:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update film' },
      { status: 500 }
    );
  }
});

export const DELETE = requireAuth(async (user, request: NextRequest, { params }: { params: { id: string } }) => {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ success: false, error: 'Film ID is required' }, { status: 400 });
  }

  try {
    // Check if film exists
    const existingFilm = await prisma.film.findUnique({
      where: { id },
      include: { screenings: true },
    });

    if (!existingFilm) {
      return NextResponse.json({ success: false, error: 'Film not found' }, { status: 404 });
    }

    if (existingFilm.archived) {
      return NextResponse.json({ 
        success: false, 
        error: 'Film is already archived' 
      }, { status: 400 });
    }

    // Archive the film instead of deleting
    const archivedFilm = await prisma.film.update({
      where: { id },
      data: { 
        archived: true,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'ARCHIVE_FILM',
        entity: 'Film',
        entityId: id,
        data: {
          filmTitle: existingFilm.title,
          filmNotes: existingFilm.notes,
          screeningsCount: existingFilm.screenings.length,
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Film archived successfully',
      data: archivedFilm,
    });
  } catch (error) {
    console.error('Error archiving film:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to archive film' },
      { status: 500 }
    );
  }
});
