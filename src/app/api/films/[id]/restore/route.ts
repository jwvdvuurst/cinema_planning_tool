import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const POST = requireAuth(async (user, request: NextRequest, { params }: { params: { id: string } }) => {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ success: false, error: 'Film ID is required' }, { status: 400 });
  }

  try {
    // Check if film exists
    const existingFilm = await prisma.film.findUnique({
      where: { id },
    });

    if (!existingFilm) {
      return NextResponse.json({ success: false, error: 'Film not found' }, { status: 404 });
    }

    if (!existingFilm.archived) {
      return NextResponse.json({ 
        success: false, 
        error: 'Film is not archived' 
      }, { status: 400 });
    }

    // Restore the film
    const restoredFilm = await prisma.film.update({
      where: { id },
      data: { 
        archived: false,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'RESTORE_FILM',
        entity: 'Film',
        entityId: id,
        data: {
          filmTitle: existingFilm.title,
          filmNotes: existingFilm.notes,
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Film restored successfully',
      data: restoredFilm,
    });
  } catch (error) {
    console.error('Error restoring film:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to restore film' },
      { status: 500 }
    );
  }
});











