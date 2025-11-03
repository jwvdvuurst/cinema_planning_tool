import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { generateResetToken, getResetTokenExpiration } from '@/lib/password';
import { sendEmail, generatePasswordResetEmail } from '@/lib/email';

export const runtime = 'nodejs';

const RequestResetSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    console.log('=== PASSWORD RESET REQUEST RECEIVED ===');
    const body = await request.json();
    console.log('Request body:', body);
    
    const { email } = RequestResetSchema.parse(body);
    console.log('Parsed email:', email);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      console.log('❌ Password reset requested for non-existent email:', email);
      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.',
      });
    }

    console.log('✓ User found:', user.name, '(ID:', user.id + ')');

    // Generate reset token
    const resetToken = generateResetToken();
    const resetExpires = getResetTokenExpiration();
    console.log('✓ Reset token generated');
    console.log('  Token expires at:', resetExpires.toISOString());

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });
    console.log('✓ User updated with reset token');

    // Send reset email
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;
    console.log('✓ Reset URL:', resetUrl);
    
    console.log('Generating password reset email...');
    const emailOptions = generatePasswordResetEmail(user.name, user.email, resetUrl);
    console.log('Email options created:', {
      to: emailOptions.to,
      subject: emailOptions.subject,
    });
    
    console.log('Attempting to send email...');
    const emailSent = await sendEmail(emailOptions);

    if (emailSent) {
      console.log('✓✓✓ Password reset email sent successfully to:', email);
    } else {
      console.error('❌❌❌ Failed to send password reset email to:', email);
    }

    console.log('=== PASSWORD RESET REQUEST COMPLETED ===');
    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('❌ Request reset error:', error);
    console.error('Error stack:', (error as Error).stack);
    
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
}
