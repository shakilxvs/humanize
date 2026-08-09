import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { requireUser } from '@/lib/session';
import { PLANS } from '@/lib/plans';

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  instructions: z.string().max(5000).optional(),
  sourceType: z.enum(['paste', 'pdf', 'docx', 'pptx', 'txt', 'image', 'zip'])
});

export async function GET() {
  try {
    const { userId } = await requireUser();
    const assignments = await db.assignment.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { sections: { select: { id: true, needsInput: true } }, analysis: true }
    });
    return NextResponse.json({ assignments });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.userMessage }, { status: err.status });
    return NextResponse.json({ error: 'Could not load your assignments.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireUser();
    const body = CreateSchema.parse(await req.json());

    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    const plan = PLANS[user.plan as keyof typeof PLANS] ?? PLANS.free;

    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const countThisMonth = await db.assignment.count({ where: { userId, createdAt: { gte: monthAgo } } });
    if (countThisMonth >= plan.monthlyAssignments) {
      throw new AppError(
        `You have reached your ${plan.label} plan limit of ${plan.monthlyAssignments} assignments this month.`,
        403
      );
    }

    const assignment = await db.assignment.create({
      data: { userId, title: body.title, instructions: body.instructions, sourceType: body.sourceType }
    });

    await db.usageEvent.create({ data: { userId, kind: 'assignment_created' } });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.userMessage }, { status: err.status });
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Please provide a title.' }, { status: 400 });
    return NextResponse.json({ error: 'Could not create the assignment.' }, { status: 500 });
  }
}
