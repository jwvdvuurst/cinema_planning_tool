import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const GET = requireAnyRole(['ADMIN', 'PROGRAMMA'])(async (user, request: NextRequest) => {
  try {
    // Get all active users
    const users = await prisma.user.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
      },
    });

    // Get all screenings for the next 3 months
    const now = new Date();
    const future = new Date();
    future.setMonth(future.getMonth() + 3);
    
    const screenings = await prisma.screening.findMany({
      where: {
        startsAt: {
          gte: now,
          lte: future,
        },
      },
      select: {
        id: true,
        startsAt: true,
      },
    });

    const screeningIds = screenings.map(s => s.id);

    // Get availability entries for these screenings
    const availabilityEntries = await prisma.availability.findMany({
      where: {
        screeningId: {
          in: screeningIds,
        },
      },
      select: {
        userId: true,
        createdAt: true,
      },
      distinct: ['userId'],
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Create a map of user availability status
    const userAvailabilityMap = new Map();
    availabilityEntries.forEach(entry => {
      if (!userAvailabilityMap.has(entry.userId)) {
        userAvailabilityMap.set(entry.userId, {
          hasEnteredAvailability: true,
          lastAvailabilityEntry: entry.createdAt.toISOString(),
        });
      }
    });

    // Build the status array
    const availabilityStatuses = users.map(user => {
      const availabilityInfo = userAvailabilityMap.get(user.id) || {
        hasEnteredAvailability: false,
        lastAvailabilityEntry: null,
      };

      return {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        hasEnteredAvailability: availabilityInfo.hasEnteredAvailability,
        lastAvailabilityEntry: availabilityInfo.lastAvailabilityEntry,
        screeningsCount: screeningIds.length,
      };
    });

    return NextResponse.json({
      success: true,
      data: availabilityStatuses,
    });
  } catch (error) {
    console.error('Error fetching availability status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch availability status' },
      { status: 500 }
    );
  }
});











