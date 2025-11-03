import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';

const SetConstraintSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export const POST = requireRole('ADMIN')(async (user, request: NextRequest) => {
  try {
    const body = await request.json();
    const { key, value } = SetConstraintSchema.parse(body);

    // Validate constraint value is numeric for known constraints
    if (['max_shifts_per_week', 'max_same_film_per_month'].includes(key)) {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid numeric value for constraint' },
          { status: 400 }
        );
      }
    }

    // Upsert constraint
    const constraint = await prisma.constraint.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'constraint_set',
        entity: 'constraint',
        entityId: constraint.id,
        data: {
          key,
          value,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: constraint,
    });
  } catch (error) {
    console.error('Set constraint error:', error);
    
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

