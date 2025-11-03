import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export const POST = requireAnyRole(['ADMIN', 'PROGRAMMA'])(async (user, request: NextRequest) => {
  try {
    const body = await request.json();
    const { template, screeningIds } = body;

    if (!template || !screeningIds || !Array.isArray(screeningIds)) {
      return NextResponse.json(
        { success: false, error: 'Template and screening IDs are required' },
        { status: 400 }
      );
    }

    // Get all active users
    const users = await prisma.user.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Get screenings information
    const screenings = await prisma.screening.findMany({
      where: {
        id: { in: screeningIds },
      },
      include: {
        film: {
          select: {
            title: true,
          },
        },
      },
    });

    let sentCount = 0;
    const errors: string[] = [];

    // Send emails to all active users
    for (const userData of users) {
      try {
        // Replace placeholders in the template
        let personalizedTemplate = template
          .replace(/\[USER_NAME\]/g, userData.name)
          .replace(/\[SCREENINGS_COUNT\]/g, screenings.length.toString())
          .replace(/\[AVAILABILITY_LINK\]/g, `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/availability?user=${userData.id}`);

        // Create availability request record
        await prisma.availabilityRequest.create({
          data: {
            userId: userData.id,
            requestedBy: user.id,
            screeningIds: screeningIds,
            template: personalizedTemplate,
            status: 'SENT',
          },
        });

        // Send email (in a real implementation, you'd use your email service)
        await sendEmail({
          to: userData.email,
          subject: 'Availability Request - Film Theater',
          html: personalizedTemplate.replace(/\n/g, '<br>'),
        });

        sentCount++;
      } catch (error) {
        console.error(`Failed to send email to ${userData.email}:`, error);
        errors.push(`${userData.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Log the bulk request
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'SEND_AVAILABILITY_REQUEST',
        entity: 'AvailabilityRequest',
        entityId: 'bulk',
        data: {
          usersCount: users.length,
          sentCount,
          errorCount: errors.length,
          screeningsCount: screenings.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      sentCount,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error sending availability request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send availability request' },
      { status: 500 }
    );
  }
});











