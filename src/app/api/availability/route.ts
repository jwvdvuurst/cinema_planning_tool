import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export const GET = requireAuth(async (user, request: NextRequest) => {
  try {
    const availabilities = await prisma.availability.findMany({
      where: {
        userId: user.id,
      },
      include: {
        screening: {
          include: {
            film: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: availabilities,
    });
  } catch (error) {
    console.error('Get availability error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});


