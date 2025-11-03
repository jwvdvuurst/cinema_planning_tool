import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { Role, AvailabilityStatus } from '@/types';

const SetAvailabilitySchema = z.object({
  screeningId: z.string().uuid(),
  role: z.nativeEnum(Role),
  status: z.nativeEnum(AvailabilityStatus),
});

export const POST = requireAuth(async (user, request: NextRequest) => {
  try {
    const body = await request.json();
    const { screeningId, role, status } = SetAvailabilitySchema.parse(body);

    // Check if user has the required role
    if (!user.roles.includes(role) && !user.roles.includes('ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions for this role' },
        { status: 403 }
      );
    }

    // Upsert availability
    const availability = await prisma.availability.upsert({
      where: {
        screeningId_userId_role: {
          screeningId,
          userId: user.id,
          role,
        },
      },
      update: {
        status,
      },
      create: {
        screeningId,
        userId: user.id,
        role,
        status,
      },
    });

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'availability_set',
        entity: 'availability',
        entityId: availability.id,
        data: {
          screeningId,
          role,
          status,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error('Set availability error:', error);
    
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

