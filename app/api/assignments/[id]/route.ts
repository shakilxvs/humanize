import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { requireUser, requireOwnedAssignment } from '@/lib/session';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    await requireOwnedAssignment(params.id, userId);

    const assignment = await db.assignment.findUnique({
      where: { id: params.id },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            questions: true,
            answers: true,
            reconstructions: { orderBy: { createdAt: 'desc' }, take: 1 }
          }
        },
        analysis: true,
        versions: { orderBy: { createdAt: 'desc' } },
        files: true
      }
    });

    return NextResponse.json({ assignment });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.userMessage }, { status: err.status });
    return NextResponse.json({ error: 'Could not load this assignment.' }, { status: 500 });
  }
}
