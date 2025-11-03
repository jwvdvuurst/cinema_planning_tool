import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const POST = requireAnyRole(['ADMIN'])(async (user, request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (existingUser.active) {
      return NextResponse.json(
        { success: false, error: 'User is already active' },
        { status: 400 }
      );
    }

    // Reactivate the user
    await prisma.user.update({
      where: { id },
      data: { active: true },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'REACTIVATE_USER',
        entity: 'User',
        entityId: id,
        data: {
          userName: existingUser.name,
          userEmail: existingUser.email,
        },
      },
    });

    return NextResponse.json({ success: true, message: 'User reactivated successfully' });
  } catch (error) {
    console.error('Error reactivating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reactivate user' },
      { status: 500 }
    );
  }
});







