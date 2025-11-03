export const Role = {
  TECHNIEK: 'TECHNIEK',
  ZAALWACHT: 'ZAALWACHT',
  PROGRAMMA: 'PROGRAMMA',
  ADMIN: 'ADMIN',
} as const;

export type Role = typeof Role[keyof typeof Role];

export const AvailabilityStatus = {
  available: 'available',
  unavailable: 'unavailable',
} as const;

export type AvailabilityStatus = typeof AvailabilityStatus[keyof typeof AvailabilityStatus];

export const AssignmentSource = {
  auto: 'auto',
  manual: 'manual',
} as const;

export type AssignmentSource = typeof AssignmentSource[keyof typeof AssignmentSource];

export const SwapStatus = {
  open: 'open',
  accepted: 'accepted',
  rejected: 'rejected',
  cancelled: 'cancelled',
} as const;

export type SwapStatus = typeof SwapStatus[keyof typeof SwapStatus];

export interface User {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Film {
  id: string;
  title: string;
  notes?: string;
  runtime?: number;
  archived?: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Screening {
  id: string;
  filmId: string;
  startsAt: Date;
  endsAt: Date;
  location?: string;
  notes?: string;
  film?: Film;
}

export interface Availability {
  id: string;
  screeningId: string;
  userId: string;
  role: Role;
  status: AvailabilityStatus;
  createdAt: Date;
  user?: User;
  screening?: Screening;
}

export interface Assignment {
  id: string;
  screeningId: string;
  userId: string;
  role: Role;
  source: AssignmentSource;
  createdBy?: string;
  createdAt: Date;
  user?: User;
  screening?: Screening;
}

export interface SwapRequest {
  id: string;
  assignmentId: string;
  requesterId: string;
  status: SwapStatus;
  createdAt: Date;
  decidedAt?: Date;
  decidedBy?: string;
  assignment?: Assignment;
  requester?: User;
}

export interface Constraint {
  id: string;
  key: string;
  value: string;
}

export interface SkillTag {
  id: string;
  userId: string;
  tag: string;
  user?: User;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  action: string;
  entity: string;
  entityId: string;
  data?: any;
  createdAt: Date;
  actor?: User;
}

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
}

export interface PlannerOptions {
  rangeStart: Date;
  rangeEnd: Date;
  dryRun: boolean;
}

