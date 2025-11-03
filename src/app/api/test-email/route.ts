import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Email address required' },
        { status: 400 }
      );
    }

    console.log('Testing email configuration...');
    console.log('Attempting to send test email to:', to);

    const testEmail = {
      to,
      subject: 'Test Email - Film Theater Planner',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Test Email</h2>
          <p>This is a test email from the Film Theater Planner system.</p>
          <p>If you received this, your email configuration is working correctly!</p>
          <hr/>
          <p style="font-size: 12px; color: #666;">
            Sent at: ${new Date().toISOString()}
          </p>
        </div>
      `,
      text: `
Test Email

This is a test email from the Film Theater Planner system.
If you received this, your email configuration is working correctly!

Sent at: ${new Date().toISOString()}
      `,
    };

    const success = await sendEmail(testEmail);

    if (success) {
      console.log('✓ Test email sent successfully!');
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully! Check your inbox.',
      });
    } else {
      console.error('✗ Test email failed to send');
      return NextResponse.json({
        success: false,
        error: 'Failed to send test email. Check server logs for details.',
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return current email configuration (without sensitive data)
  const config = {
    smtp_host: process.env.SMTP_HOST || 'NOT SET',
    smtp_port: process.env.SMTP_PORT || 'NOT SET',
    smtp_user: process.env.SMTP_USER ? '***configured***' : 'NOT SET',
    smtp_pass: process.env.SMTP_PASS ? '***configured***' : 'NOT SET',
    smtp_from: process.env.SMTP_FROM || 'NOT SET',
  };

  return NextResponse.json({
    success: true,
    config,
    message: 'Use POST with { "to": "email@example.com" } to test email sending',
  });
}


