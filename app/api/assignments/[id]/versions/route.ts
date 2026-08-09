import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { requireUser, requireOwnedAssignment } from '@/lib/session';

const SaveSchema = z.object({
  label: z.enum(['analyzed', 'personalized', 'edited', 'final']),
  content: z.string().min(1).max(500_000)
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    await requireOwnedAssignment(params.id, userId);
    const versions = await db.assignmentVersion.findMany({
      where: { assignmentId: params.id },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ versions });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.userMessage }, { status: err.status });
    return NextResponse.json({ error: 'Could not load version history.' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireUser();
    await requireOwnedAssignment(params.id, userId);

    const body = SaveSchema.parse(await req.json());
    const version = await db.assignmentVersion.create({
      data: { assignmentId: params.id, label: body.label, content: body.content }
    });

    if (body.label === 'final') {
      await db.assignment.update({ where: { id: params.id }, data: { status: 'completed' } });
    }

    return NextResponse.json({ version }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.userMessage }, { status: err.status });
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Nothing to save yet.' }, { status: 400 });
    return NextResponse.json({ error: 'Could not save this version.' }, { status: 500 });
  }
}
