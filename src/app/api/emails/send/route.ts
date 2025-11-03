import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmail, generateAssignmentEmail, generateSwapRequestEmail, generateDeficitAlertEmail, generateAssignmentsDigestEmail } from '@/lib/email';
import { requireAnyRole } from '@/lib/auth';
import { prisma } from '@/lib/db';

const SendEmailSchema = z.object({
  type: z.enum(['assignment', 'swap_request', 'deficit_alert', 'assignments_digest']),
  data: z.any(),
  recipients: z.array(z.string().email()),
});

export const POST = requireAnyRole(['PROGRAMMA', 'ADMIN'])(async (user, request: NextRequest) => {
  try {
    const body = await request.json();
    const { type, data, recipients } = SendEmailSchema.parse(body);

    let emailOptions;
    let successCount = 0;

    switch (type) {
      case 'assignment':
        emailOptions = generateAssignmentEmail(
          data.userName,
          data.screening,
          data.role
        );
        break;
      
      case 'swap_request':
        emailOptions = generateSwapRequestEmail(
          data.targetUserName,
          data.requesterName,
          data.screening,
          data.role
        );
        break;
      
      case 'deficit_alert':
        emailOptions = generateDeficitAlertEmail(
          data.deficits,
          data.screenings
        );
        break;
      case 'assignments_digest':
        emailOptions = generateAssignmentsDigestEmail(
          data.userName,
          data.assignments.map((a: any) => ({
            filmTitle: a.film?.title || a.filmTitle,
            startsAt: new Date(a.startsAt),
            endsAt: new Date(a.endsAt),
            location: a.location,
            role: a.role,
            assignmentId: a.assignmentId || a.id,
          })),
          data.swapBaseUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/swaps`
        );
        break;
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid email type' },
          { status: 400 }
        );
    }

    // Send emails to all recipients
    for (const recipient of recipients) {
      const emailSent = await sendEmail({
        ...emailOptions,
        to: recipient,
      });
      
      if (emailSent) {
        successCount++;
      }
    }

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'emails_sent',
        entity: 'email',
        entityId: 'bulk',
        data: {
          type,
          recipients: recipients.length,
          successCount,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        sent: successCount,
        total: recipients.length,
      },
    });
  } catch (error) {
    console.error('Send email error:', error);
    
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

