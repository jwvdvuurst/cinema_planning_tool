import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAnyRole } from '@/lib/auth';
import { generatePassword, hashPassword, generateResetToken, getResetTokenExpiration } from '@/lib/password';
import { sendEmail, generateWelcomeEmail } from '@/lib/email';

export const runtime = 'nodejs';

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  roles: z.array(z.string()),
});

export const GET = requireAnyRole(['ADMIN'])(async (user, request: NextRequest) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = requireAnyRole(['ADMIN'])(async (user, request: NextRequest) => {
  try {
    const body = await request.json();
    const { name, email, roles } = CreateUserSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Generate initial password and reset token
    const initialPassword = generatePassword(12);
    const hashedPassword = await hashPassword(initialPassword);
    const resetToken = generateResetToken();
    const resetExpires = getResetTokenExpiration();
    // Give 24 hours for initial password setup
    resetExpires.setHours(resetExpires.getHours() + 23);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        roles,
        active: true,
        password: hashedPassword,
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // Send welcome email with initial password
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;
    
    const emailOptions = generateWelcomeEmail(name, email, initialPassword, resetUrl);
    const emailSent = await sendEmail(emailOptions);

    if (!emailSent) {
      console.error('Failed to send welcome email to:', email);
      // Don't fail the user creation if email fails, just log it
    }

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_USER',
        entity: 'User',
        entityId: newUser.id,
        actorId: user.id,
        data: {
          userEmail: email,
          userName: name,
          roles,
          emailSent,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: newUser,
      emailSent,
    });
  } catch (error) {
    console.error('Create user error:', error);
    
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
