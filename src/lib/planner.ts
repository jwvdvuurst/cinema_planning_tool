import { prisma } from './db';
import { Role, AvailabilityStatus } from '@/types';

export interface PlannerResult {
  assignments: {
    screeningId: string;
    userId: string;
    role: Role;
  }[];
  deficits: {
    screeningId: string;
    role: Role;
    needed: number;
    available: number;
  }[];
  screenings: {
    id: string;
    filmTitle: string;
    startsAt: string;
    location: string;
    assignments: {
      userId: string;
      userName: string;
      role: Role;
    }[];
  }[];
}

export interface PlannerOptions {
  rangeStart: Date;
  rangeEnd: Date;
  dryRun: boolean;
}

export async function runPlanner(options: PlannerOptions): Promise<PlannerResult> {
  const { rangeStart, rangeEnd, dryRun } = options;

  // Get all screenings in the range
  const screenings = await withRetry(() => prisma.screening.findMany({
    where: {
      startsAt: {
        gte: rangeStart,
        lte: rangeEnd,
      },
    },
    include: {
      film: true,
    },
  }));

  const assignments: PlannerResult['assignments'] = [];
  const deficits: PlannerResult['deficits'] = [];

  // In-run planning state to improve fairness within a single planner execution
  const plannedAssignments: Array<{ userId: string; screeningId: string; role: Role; startsAt: Date; filmId: string }>
    = [];
  const inRunRoleCounts = new Map<string, number>(); // key: `${userId}:${role}` -> count in this run

  // Preload existing assignments within the planning range for balancing
  const existingAssignmentsInRange = await prisma.assignment.findMany({
    where: {
      screening: {
        startsAt: { gte: rangeStart, lte: rangeEnd },
      },
    },
    include: { screening: true },
  });
  const existingCountByUserRole = new Map<string, number>(); // key: `${userId}:${role}`
  for (const a of existingAssignmentsInRange) {
    const key = `${a.userId}:${a.role}`;
    existingCountByUserRole.set(key, (existingCountByUserRole.get(key) || 0) + 1);
  }

  // Get constraints
  const maxShiftsPerWeek = await getConstraint('max_shifts_per_week', 2);
  const maxSameFilmPerMonth = await getConstraint('max_same_film_per_month', 2);

  for (const screening of screenings) {
    console.log(`\nPlanning screening: ${screening.film.title} (${screening.startsAt})`);
    
    // Fetch existing assignments for this screening
    const existingAssignments = await withRetry(() => prisma.assignment.findMany({
      where: { screeningId: screening.id },
      select: { userId: true, role: true },
    }));

    const screeningAssignments: { userId: string; role: string }[] = [...existingAssignments];
    const needed = 2; // Always need 2 people per role
    
    // Plan for each role
    for (const role of ['TECHNIEK', 'ZAALWACHT'] as const) {
      // Check if this role already has enough assignments
      const currentCount = screeningAssignments.filter(a => a.role === role).length;
      if (currentCount >= needed) {
        console.log(`  ${role}: Already has ${currentCount}/${needed} assignments, skipping`);
        continue;
      }
      const stillNeeded = needed - currentCount;

      // Get available users for this screening and role
      const candidates = await getCandidates(screening.id, role);
      console.log(`  ${role}: Found ${candidates.length} candidates, need ${stillNeeded} more`);
      
      // Filter candidates based on constraints and exclude already assigned users
      const assignedUserIds = screeningAssignments.map(a => a.userId);
      const validCandidates = await filterCandidates(
        candidates,
        screening,
        role,
        maxShiftsPerWeek,
        maxSameFilmPerMonth,
        rangeStart,
        rangeEnd
      );
      
      // Remove users already assigned to this screening
      const availableCandidates = validCandidates.filter(candidate => 
        !assignedUserIds.includes(candidate.userId)
      );
      
      console.log(`  ${role}: ${availableCandidates.length} valid candidates after filtering and excluding assigned`);

      // Sort by fairness heuristic
      const sortedCandidates = await sortCandidatesWithFairness(
        availableCandidates,
        role,
        existingCountByUserRole,
        inRunRoleCounts
      );

      // Assign up to 'stillNeeded' people
      const assigned: typeof sortedCandidates = [];
      for (const candidate of sortedCandidates) {
        if (assigned.length >= stillNeeded) break;

        // Enforce weekly and same-film limits considering in-run planned assignments
        const weekStart = getWeekStart(screening.startsAt);
        const weekEnd = addDays(weekStart, 7);

        const dbWeekly = await countWeeklyAssignments(candidate.userId, weekStart, weekEnd);
        const inRunWeekly = plannedAssignments.filter(p => p.userId === candidate.userId && p.startsAt >= weekStart && p.startsAt < weekEnd).length;
        if (dbWeekly + inRunWeekly >= maxShiftsPerWeek) {
          continue; // would exceed weekly limit
        }

        const monthStart = getMonthStart(screening.startsAt);
        const monthEnd = addMonths(monthStart, 1);
        const dbFilmMonthly = await countFilmMonthlyAssignments(candidate.userId, screening.filmId, monthStart, monthEnd);
        const inRunFilmMonthly = plannedAssignments.filter(p => p.userId === candidate.userId && p.filmId === screening.filmId && p.startsAt >= monthStart && p.startsAt < monthEnd).length;
        if (dbFilmMonthly + inRunFilmMonthly >= maxSameFilmPerMonth) {
          continue; // would exceed same-film limit
        }

        assigned.push(candidate);

        // Update in-run balancing state
        const roleKey = `${candidate.userId}:${role}`;
        inRunRoleCounts.set(roleKey, (inRunRoleCounts.get(roleKey) || 0) + 1);
        plannedAssignments.push({
          userId: candidate.userId,
          screeningId: screening.id,
          role,
          startsAt: screening.startsAt,
          filmId: screening.filmId,
        });
      }
      console.log(`  ${role}: Assigning ${assigned.length}/${stillNeeded} people`);
      
      for (const candidate of assigned) {
        console.log(`    - Assigning ${candidate.user?.name || candidate.userId} to ${role}`);
        screeningAssignments.push({ userId: candidate.userId, role });
        assignments.push({
          screeningId: screening.id,
          userId: candidate.userId,
          role,
        });
      }

      // Check for deficits
      const totalAfterAssign = currentCount + assigned.length;
      if (totalAfterAssign < needed) {
        console.log(`    - DEFICIT: Need ${needed}, have ${totalAfterAssign} for ${role}`);
        deficits.push({
          screeningId: screening.id,
          role,
          needed,
          available: totalAfterAssign,
        });
      }
    }
  }

  // If not a dry run, persist the assignments
  if (!dryRun) {
    await persistAssignments(assignments);
  }

  // Get user information for assignments
  const userIds = [...new Set(assignments.map(a => a.userId))];
  const users = await withRetry(() => prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  }));

  const userMap = new Map(users.map(u => [u.id, u.name]));

  // Create enhanced screenings data
  const screeningsWithAssignments = screenings.map(screening => ({
    id: screening.id,
    filmTitle: screening.film.title,
    startsAt: screening.startsAt.toISOString(),
    location: screening.location,
    assignments: assignments
      .filter(a => a.screeningId === screening.id)
      .map(a => ({
        userId: a.userId,
        userName: userMap.get(a.userId) || 'Unknown',
        role: a.role,
      })),
  }));

  return { assignments, deficits, screenings: screeningsWithAssignments };
}

async function getCandidates(screeningId: string, role: Role) {
  // Get volunteers who have explicitly marked themselves as available
  const explicitAvailabilities = await withRetry(() => prisma.availability.findMany({
    where: {
      screeningId,
      role,
      status: 'available',
    },
    include: {
      user: true,
    },
  }));

  // If no explicit availabilities exist, get all active volunteers with this role
  // who haven't explicitly marked themselves as unavailable for this screening
  const unavailableUserIds = await withRetry(() => prisma.availability.findMany({
    where: {
      screeningId,
      role,
      status: 'unavailable',
    },
    select: {
      userId: true,
    },
  }));

  const unavailableIds = unavailableUserIds.map(a => a.userId);

  const availableUsers = await withRetry(() => prisma.user.findMany({
    where: {
      roles: {
        has: role,
      },
      active: true,
      ...(unavailableIds.length > 0 && {
        id: {
          notIn: unavailableIds,
        },
      }),
    },
  }));

  // Convert users to availability-like format for compatibility
  const defaultAvailables = availableUsers.map(user => ({
    id: `default-${user.id}-${screeningId}`,
    screeningId,
    userId: user.id,
    role,
    status: 'available' as const,
    user,
  }));

  // Always use default-available pool, but keep explicit available first for prioritization
  const explicitMap = new Map(explicitAvailabilities.map(a => [a.userId, a]));
  const merged = [
    ...explicitAvailabilities,
    ...defaultAvailables.filter(a => !explicitMap.has(a.userId)),
  ];
  return merged;
}

async function filterCandidates(
  candidates: any[],
  screening: any,
  role: Role,
  maxShiftsPerWeek: number,
  maxSameFilmPerMonth: number,
  rangeStart: Date,
  rangeEnd: Date
) {
  const validCandidates = [];

  for (const candidate of candidates) {
    // Check weekly assignment limit
    const weekStart = getWeekStart(screening.startsAt);
    const weekEnd = addDays(weekStart, 7);
    
    const weeklyAssignments = await countWeeklyAssignments(
      candidate.userId,
      weekStart,
      weekEnd
    );
    
    if (weeklyAssignments >= maxShiftsPerWeek) {
      continue;
    }

    // Check monthly same-film limit
    const monthStart = getMonthStart(screening.startsAt);
    const monthEnd = addMonths(monthStart, 1);
    
    const monthlyFilmAssignments = await countFilmMonthlyAssignments(
      candidate.userId,
      screening.filmId,
      monthStart,
      monthEnd
    );
    
    if (monthlyFilmAssignments >= maxSameFilmPerMonth) {
      continue;
    }

    validCandidates.push(candidate);
  }

  return validCandidates;
}

async function sortCandidatesWithFairness(
  candidates: any[],
  role: Role,
  existingCountByUserRole: Map<string, number>,
  inRunRoleCounts: Map<string, number>
) {
  // Batch fetch last assignments and skill scores for all candidates to minimize DB calls
  const userIds = Array.from(new Set(candidates.map(c => c.userId)));

  const lastAssignments = await withRetry(() => prisma.assignment.findMany({
    where: { userId: { in: userIds } },
    orderBy: { createdAt: 'desc' },
    select: { userId: true, createdAt: true },
  }));
  const lastAssignedMap = new Map<string, Date>();
  for (const la of lastAssignments) {
    if (!lastAssignedMap.has(la.userId)) {
      lastAssignedMap.set(la.userId, la.createdAt as Date);
    }
  }

  const skillTags = await withRetry(() => prisma.skillTag.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, tag: true },
  }));
  const skillScoreMap = new Map<string, number>();
  for (const st of skillTags) {
    const tag = st.tag.toLowerCase();
    const matches = tag.includes(role.toLowerCase()) || tag.includes('expert') || tag.includes('lead');
    if (matches) {
      skillScoreMap.set(st.userId, (skillScoreMap.get(st.userId) || 0) + 1);
    }
  }

  const candidatesWithScores = candidates.map((candidate) => {
    const lastAssigned = lastAssignedMap.get(candidate.userId) || null;
    const skillScore = skillScoreMap.get(candidate.userId) || 0;
    const existingCount = existingCountByUserRole.get(`${candidate.userId}:${role}`) || 0;
    const inRunCount = inRunRoleCounts.get(`${candidate.userId}:${role}`) || 0;
    return {
      ...candidate,
      lastAssigned,
      skillScore,
      existingCount,
      inRunCount,
    };
  });

  // Sort by: 1) Fewer assignments in range + in-run, 2) Older/none last assignment, 3) Higher skill score
  return candidatesWithScores.sort((a, b) => {
    const aTotal = a.existingCount + a.inRunCount;
    const bTotal = b.existingCount + b.inRunCount;
    if (aTotal !== bTotal) return aTotal - bTotal; // prefer fewer total in-range assignments

    // Primary sort: by last assigned date (older first)
    if (a.lastAssigned && b.lastAssigned) {
      const timeDiff = a.lastAssigned.getTime() - b.lastAssigned.getTime();
      if (Math.abs(timeDiff) > 1000) { // More than 1 second difference
        return timeDiff;
      }
    } else if (a.lastAssigned && !b.lastAssigned) {
      return 1; // Prefer user with no prior assignments
    } else if (!a.lastAssigned && b.lastAssigned) {
      return -1; // Prefer user with no prior assignments
    }

    // Secondary sort: by skill score (higher first)
    return b.skillScore - a.skillScore;
  });
}

async function persistAssignments(assignments: PlannerResult['assignments']) {
  if (assignments.length === 0) return;

  await withRetry(() => prisma.assignment.createMany({
    data: assignments.map((assignment) => ({
      ...assignment,
      source: 'auto' as const,
    })),
    skipDuplicates: true,
  }));

  // Log to audit trail
  await withRetry(() => prisma.auditLog.create({
    data: {
      action: 'PLANNER_RUN',
      entity: 'Assignment',
      entityId: 'bulk',
      data: {
        assignments: assignments.length,
        screeningIds: Array.from(new Set(assignments.map(a => a.screeningId))),
      },
    },
  }));
}

// Helper functions
async function getConstraint(key: string, defaultValue: number): Promise<number> {
  const constraint = await withRetry(() => prisma.constraint.findUnique({
    where: { key },
  }));
  return constraint ? parseInt(constraint.value) : defaultValue;
}

async function countWeeklyAssignments(userId: string, weekStart: Date, weekEnd: Date): Promise<number> {
  const assignments = await withRetry(() => prisma.assignment.findMany({
    where: {
      userId,
      screening: {
        startsAt: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
    },
  }));
  return assignments.length;
}

async function countFilmMonthlyAssignments(
  userId: string,
  filmId: string,
  monthStart: Date,
  monthEnd: Date
): Promise<number> {
  const assignments = await withRetry(() => prisma.assignment.findMany({
    where: {
      userId,
      screening: {
        filmId,
        startsAt: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
    },
  }));
  return assignments.length;
}

async function lastAssignedAt(userId: string): Promise<Date | null> {
  const lastAssignment = await prisma.assignment.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      screening: true,
    },
  });
  return lastAssignment?.createdAt || null;
}

async function getSkillScore(userId: string, role: Role): Promise<number> {
  const skillTags = await withRetry(() => prisma.skillTag.findMany({
    where: { userId },
  }));
  
  // Simple scoring: count relevant skill tags
  const relevantTags = skillTags.filter((tag: any) => 
    tag.tag.toLowerCase().includes(role.toLowerCase()) ||
    tag.tag.toLowerCase().includes('expert') ||
    tag.tag.toLowerCase().includes('lead')
  );
  
  return relevantTags.length;
}

// Date utility functions
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Generic retry utility for transient DB errors
async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 300): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      // Only retry known transient Prisma connection errors
      const msg = String(e?.message || '');
      const code = (e as any)?.code;
      const isTransient = code === 'P1001' || /Can\'t reach database server/i.test(msg) || /Connection terminated unexpectedly/i.test(msg);
      if (!isTransient || i === attempts - 1) {
        throw e;
      }
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

