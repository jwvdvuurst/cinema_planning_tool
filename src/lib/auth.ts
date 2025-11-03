import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { prisma } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  active: boolean;
}

export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return null;

    // Verify JWT token
    const decoded = verify(token, JWT_SECRET) as { userId: string; email: string };
    
    if (!decoded.userId) return null;

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!dbUser || !dbUser.active) {
      return null;
    }

    return dbUser;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export function hasRole(user: User | null, requiredRole: string): boolean {
  if (!user) return false;
  return user.roles.includes(requiredRole) || user.roles.includes('ADMIN');
}

export function hasAnyRole(user: User | null, roles: string[]): boolean {
  if (!user) return false;
  return roles.some(role => user.roles.includes(role)) || user.roles.includes('ADMIN');
}

export function requireAuth(handler: (user: User, ...args: any[]) => any) {
  return async (request: NextRequest, ...args: any[]) => {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return handler(user, request, ...args);
  };
}

export function requireRole(role: string) {
  return function (handler: (user: User, ...args: any[]) => any) {
    return async (request: NextRequest, ...args: any[]) => {
      const user = await getUserFromRequest(request);
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      if (!hasRole(user, role)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden - insufficient permissions' },
          { status: 403 }
        );
      }
      
      return handler(user, request, ...args);
    };
  };
}

export function requireAnyRole(roles: string[]) {
  return function (handler: (user: User, ...args: any[]) => any) {
    return async (request: NextRequest, ...args: any[]) => {
      const user = await getUserFromRequest(request);
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      if (!hasAnyRole(user, roles)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden - insufficient permissions' },
          { status: 403 }
        );
      }
      
      return handler(user, request, ...args);
    };
  };
}

