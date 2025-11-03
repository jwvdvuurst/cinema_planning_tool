import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAnyRole } from '@/lib/auth';
import { prisma } from '@/lib/db';

const CreateTemplateSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  subject: z.string().min(1),
  bodyHtml: z.string().min(1),
  bodyText: z.string().optional(),
  variables: z.array(z.string()).default([]),
});

export const GET = requireAnyRole(['ADMIN'])(async (user, request: NextRequest) => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('Get email templates error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = requireAnyRole(['ADMIN'])(async (user, request: NextRequest) => {
  try {
    const body = await request.json();
    const data = CreateTemplateSchema.parse(body);

    const template = await prisma.emailTemplate.create({
      data,
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'CREATE_EMAIL_TEMPLATE',
        entity: 'EmailTemplate',
        entityId: template.id,
        data: { key: data.key, name: data.name },
      },
    });

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Create email template error:', error);
    
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





