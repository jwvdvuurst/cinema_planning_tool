import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const DELETE = requireAnyRole(['ADMIN'])(async (user, request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        assignments: true,
        availabilities: true,
        swapRequests: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has any assignments (safety check)
    if (existingUser.assignments.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot permanently delete user with existing assignments. Please remove all assignments first.',
      }, { status: 400 });
    }

    // Store user data for audit log before deletion
    const userData = {
      userName: existingUser.name,
      userEmail: existingUser.email,
      roles: existingUser.roles,
      assignmentsCount: existingUser.assignments.length,
      availabilitiesCount: existingUser.availabilities.length,
      swapRequestsCount: existingUser.swapRequests.length,
    };

    // Delete all related data first (cascading deletes should handle this, but being explicit)
    await prisma.availability.deleteMany({
      where: { userId: id },
    });

    await prisma.swapRequest.deleteMany({
      where: { requesterId: id },
    });

    await prisma.swapRequest.deleteMany({
      where: { targetUserId: id },
    });

    // Delete the user
    await prisma.user.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'PERMANENT_DELETE_USER',
        entity: 'User',
        entityId: id,
        data: userData,
      },
    });

    return NextResponse.json({ success: true, message: 'User permanently deleted successfully' });
  } catch (error) {
    console.error('Error permanently deleting user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to permanently delete user' },
      { status: 500 }
    );
  }
});







