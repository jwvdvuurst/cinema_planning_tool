import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAnyRole } from '@/lib/auth';

const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  roles: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

export const PUT = requireAnyRole(['ADMIN'])(async (user, request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const body = await request.json();
    const updateData = UpdateUserSchema.parse(body);

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

    // If email is being updated, check for duplicates
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: updateData.email },
      });

      if (emailExists) {
        return NextResponse.json(
          { success: false, error: 'Email already in use' },
          { status: 409 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_USER',
        entity: 'User',
        entityId: id,
        actorId: user.id,
        data: {
          changes: updateData,
          previousData: {
            name: existingUser.name,
            email: existingUser.email,
            roles: existingUser.roles,
            active: existingUser.active,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update user error:', error);
    
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

    // Check if user has active assignments
    const activeAssignments = existingUser.assignments.filter(a => 
      new Date(a.screening.startsAt) > new Date()
    );

    if (activeAssignments.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete user with active future assignments',
          details: `User has ${activeAssignments.length} future assignments`
        },
        { status: 409 }
      );
    }

    // Soft delete - mark as inactive instead of hard delete
    const deletedUser = await prisma.user.update({
      where: { id },
      data: { active: false },
    });

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_USER',
        entity: 'User',
        entityId: id,
        actorId: user.id,
        data: {
          userName: existingUser.name,
          userEmail: existingUser.email,
          note: 'User marked as inactive',
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: deletedUser,
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});
