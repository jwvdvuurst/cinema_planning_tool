import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const CheckUserSchema = z.object({
  email: z.string().email(),
});

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { email } = CheckUserSchema.parse(body);

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        active: true,
      },
    });

    if (user && user.active) {
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: user.roles,
          active: user.active,
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: 'User not found or inactive',
    });
  } catch (error) {
    console.error('Check user error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
};
