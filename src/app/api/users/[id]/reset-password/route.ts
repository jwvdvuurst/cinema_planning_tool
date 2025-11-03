import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAnyRole } from '@/lib/auth';
import { generatePassword, hashPassword } from '@/lib/password';
import { sendEmail } from '@/lib/email';

export const POST = requireAnyRole(['ADMIN'])(async (user, request: NextRequest, context: any) => {
  try {
    const { id } = context.params;

    // Get the target user
    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate new password
    const newPassword = generatePassword(12);
    const hashedPassword = await hashPassword(newPassword);

    // Update user's password
    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    });

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'RESET_USER_PASSWORD',
        entity: 'User',
        entityId: id,
        data: {
          targetUserEmail: targetUser.email,
          targetUserName: targetUser.name,
        },
      },
    });

    // Send email with new password
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const emailBody = `
      <h2>Password Reset - Film Theater Planner</h2>
      <p>Hello ${targetUser.name},</p>
      <p>An administrator has generated a new temporary password for your account.</p>
      
      <div style="background: #f4f4f4; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-weight: bold;">Your temporary password:</p>
        <code style="background: #fff; padding: 12px 16px; border-radius: 4px; font-size: 18px; font-family: monospace; display: inline-block; border: 2px solid #ddd;">${newPassword}</code>
      </div>
      
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; font-weight: bold; color: #856404;">⚠️ Important: Change Your Password</p>
        <p style="margin: 8px 0 0 0; color: #856404;">For security reasons, please change this temporary password immediately after logging in.</p>
      </div>
      
      <h3>How to Change Your Password:</h3>
      <ol style="line-height: 1.8;">
        <li>Go to <a href="${baseUrl}/auth/login" style="color: #2563eb;">${baseUrl}/auth/login</a></li>
        <li>Log in with your email (<strong>${targetUser.email}</strong>) and the temporary password above</li>
        <li>After logging in, click on <strong>"Settings"</strong> in the navigation menu (top of the page)</li>
        <li>Under the <strong>"Account Security"</strong> section, click the <strong>"Change Password"</strong> button</li>
        <li>Enter your temporary password as the current password</li>
        <li>Choose a new, secure password that you'll remember</li>
        <li>Click <strong>"Update Password"</strong> to save your new password</li>
      </ol>
      
      <div style="background: #e7f3ff; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; font-weight: bold; color: #1e40af;">💡 Password Requirements:</p>
        <ul style="margin: 8px 0 0 0; color: #1e40af; line-height: 1.6;">
          <li>At least 8 characters long</li>
          <li>Use a mix of letters, numbers, and special characters</li>
          <li>Choose something memorable but secure</li>
        </ul>
      </div>
      
      <p>If you did not request this password reset, please contact an administrator immediately.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated message from the Film Theater Planner. Please do not reply to this email.</p>
    `;

    const emailText = `
Password Reset - Film Theater Planner

Hello ${targetUser.name},

An administrator has generated a new temporary password for your account.

YOUR TEMPORARY PASSWORD: ${newPassword}

⚠️ IMPORTANT: Change Your Password
For security reasons, please change this temporary password immediately after logging in.

HOW TO CHANGE YOUR PASSWORD:

1. Go to ${baseUrl}/auth/login
2. Log in with your email (${targetUser.email}) and the temporary password above
3. After logging in, click on "Settings" in the navigation menu (top of the page)
4. Under the "Account Security" section, click the "Change Password" button
5. Enter your temporary password as the current password
6. Choose a new, secure password that you'll remember
7. Click "Update Password" to save your new password

PASSWORD REQUIREMENTS:
- At least 8 characters long
- Use a mix of letters, numbers, and special characters
- Choose something memorable but secure

If you did not request this password reset, please contact an administrator immediately.

---
This is an automated message from the Film Theater Planner. Please do not reply to this email.
    `;

    try {
      await sendEmail({
        to: targetUser.email,
        subject: 'Your New Password - Film Theater Planner',
        html: emailBody,
        text: emailText,
      });
    } catch (emailError) {
      console.error('Failed to send password email:', emailError);
      // Still return success since password was updated, but warn about email
      return NextResponse.json({
        success: true,
        message: 'Password reset successfully, but email could not be sent. Please provide the password manually.',
        password: newPassword, // Return password if email fails
      });
    }

    return NextResponse.json({
      success: true,
      message: `New password generated and sent to ${targetUser.email}`,
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

