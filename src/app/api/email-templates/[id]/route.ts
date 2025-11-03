import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAnyRole } from '@/lib/auth';
import { prisma } from '@/lib/db';

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  bodyHtml: z.string().min(1).optional(),
  bodyText: z.string().optional(),
  variables: z.array(z.string()).optional(),
});

export const PATCH = requireAnyRole(['ADMIN'])(async (user, request: NextRequest, { params }: { params: { id: string } }) => {
  const { id } = params;

  try {
    const body = await request.json();
    const data = UpdateTemplateSchema.parse(body);

    const template = await prisma.emailTemplate.update({
      where: { id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'UPDATE_EMAIL_TEMPLATE',
        entity: 'EmailTemplate',
        entityId: id,
        data: { updated: Object.keys(data) },
      },
    });

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Update email template error:', error);
    
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

export const DELETE = requireAnyRole(['ADMIN'])(async (user, request: NextRequest, { params }: { params: { id: string } }) => {
  const { id } = params;

  try {
    await prisma.emailTemplate.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'DELETE_EMAIL_TEMPLATE',
        entity: 'EmailTemplate',
        entityId: id,
        data: {},
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Delete email template error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});





