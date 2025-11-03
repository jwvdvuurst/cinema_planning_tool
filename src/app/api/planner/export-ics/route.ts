import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/lib/auth';
import { buildAssignmentsICS } from '@/lib/email';
import { prisma } from '@/lib/db';

export const POST = async (request: NextRequest) => {
  try {
    const { rangeStart, rangeEnd, userId } = await request.json();

    // Demo mode - return mock ICS data
    const mockAssignments = [
      {
        id: 'assignment-1',
        screening: {
          film: { title: 'The Godfather' },
          startsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000),
          location: 'Main Theater',
        },
        role: 'TECHNIEK',
        user: { name: 'Alice Johnson' },
      },
      {
        id: 'assignment-2',
        screening: {
          film: { title: 'Pulp Fiction' },
          startsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          endsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
          location: 'Main Theater',
        },
        role: 'ZAALWACHT',
        user: { name: 'Bob Smith' },
      },
    ];

    // Convert to ICS format
    const icsItems = mockAssignments.map(assignment => ({
      uid: `assignment-${assignment.id}`,
      title: `${assignment.screening.film.title} - ${assignment.role}`,
      startsAt: assignment.screening.startsAt,
      endsAt: assignment.screening.endsAt,
      location: assignment.screening.location || 'TBD',
      description: `Volunteer assignment for ${assignment.role} role`,
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/swaps?assignmentId=${assignment.id}`,
    }));

    const icsContent = buildAssignmentsICS(
      'demo@filmtheater.nl',
      icsItems
    );

    const filename = `assignments-demo-${new Date().toISOString().split('T')[0]}.ics`;

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating ICS export:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate ICS export' },
      { status: 500 }
    );
  }
};
