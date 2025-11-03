import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runPlanner } from '@/lib/planner';
import { requireAnyRole } from '@/lib/auth';

const PlannerRequestSchema = z.object({
  rangeStart: z.string().datetime(),
  rangeEnd: z.string().datetime(),
  dryRun: z.boolean().default(true),
});

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { rangeStart, rangeEnd, dryRun } = PlannerRequestSchema.parse(body);

    // Demo mode - return mock planner result
    const mockResult = {
      assignments: [
        {
          screeningId: 'screening-1',
          userId: 'user-1',
          role: 'TECHNIEK',
        },
        {
          screeningId: 'screening-1',
          userId: 'user-2',
          role: 'TECHNIEK',
        },
        {
          screeningId: 'screening-1',
          userId: 'user-3',
          role: 'ZAALWACHT',
        },
        {
          screeningId: 'screening-1',
          userId: 'user-4',
          role: 'ZAALWACHT',
        },
      ],
      deficits: [
        {
          screeningId: 'screening-3',
          role: 'TECHNIEK',
          needed: 2,
          available: 1,
        },
      ],
      screenings: [
        {
          id: 'screening-1',
          filmTitle: 'The Godfather',
          startsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Main Theater',
          assignments: [
            { userId: 'user-1', userName: 'Alice Johnson', role: 'TECHNIEK' },
            { userId: 'user-2', userName: 'Bob Smith', role: 'TECHNIEK' },
            { userId: 'user-3', userName: 'Carol Davis', role: 'ZAALWACHT' },
            { userId: 'user-4', userName: 'David Wilson', role: 'ZAALWACHT' },
          ],
        },
        {
          id: 'screening-2',
          filmTitle: 'Pulp Fiction',
          startsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Main Theater',
          assignments: [
            { userId: 'user-5', userName: 'Eva Brown', role: 'TECHNIEK' },
            { userId: 'user-6', userName: 'Frank Miller', role: 'TECHNIEK' },
            { userId: 'user-7', userName: 'Grace Lee', role: 'ZAALWACHT' },
            { userId: 'user-8', userName: 'Henry Taylor', role: 'ZAALWACHT' },
          ],
        },
        {
          id: 'screening-3',
          filmTitle: 'Cinema Paradiso',
          startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Main Theater',
          assignments: [
            { userId: 'user-9', userName: 'Ivy Chen', role: 'TECHNIEK' },
          ],
        },
      ],
    };

    return NextResponse.json({
      success: true,
      data: mockResult,
    });
  } catch (error) {
    console.error('Planner error:', error);
    
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
};

