import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';

export async function requireUser() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new AppError('Please log in.', 401);
  return { userId, email: session!.user!.email! };
}

/** Loads an assignment and throws (not leaks) if it belongs to someone else — IDOR guard. */
export async function requireOwnedAssignment(assignmentId: string, userId: string) {
  const assignment = await db.assignment.findUnique({ where: { id: assignmentId } });
  if (!assignment || assignment.userId !== userId) {
    throw new AppError('Assignment not found.', 404);
  }
  return assignment;
}
