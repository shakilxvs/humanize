import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { db } from '@/lib/db';
import { FilePlus2, ArrowRight } from 'lucide-react';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id!;

  const assignments = await db.assignment.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: { sections: { select: { needsInput: true } }, analysis: true }
  });

  const needingAttention = assignments.filter((a) => a.sections.some((s) => s.needsInput) && a.status !== 'completed');
  const completed = assignments.filter((a) => a.status === 'completed');

  return (
    <main className="min-h-screen bg-paper px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl">Your assignments</h1>
            <p className="mt-1 text-sm text-ink/60">{session?.user?.name ?? session?.user?.email}</p>
          </div>
          <Link
            href="/assignments/new"
            className="focus-ring flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink/90"
          >
            <FilePlus2 size={16} /> New assignment
          </Link>
        </div>

        {assignments.length === 0 ? (
          <div className="mt-16 rounded-card border border-dashed border-line bg-white p-12 text-center">
            <p className="font-display text-xl">Nothing here yet</p>
            <p className="mt-2 text-sm text-ink/60">Start your first assignment to see analysis and questions here.</p>
            <Link href="/assignments/new" className="mt-6 inline-block text-sm font-medium text-clay underline underline-offset-4">
              Create an assignment
            </Link>
          </div>
        ) : (
          <div className="mt-10 space-y-10">
            {needingAttention.length > 0 && (
              <section>
                <h2 className="text-xs font-medium uppercase tracking-wide text-ink/50">Needs your attention</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {needingAttention.map((a) => (
                    <AssignmentCard key={a.id} assignment={a} />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xs font-medium uppercase tracking-wide text-ink/50">All assignments</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {assignments.map((a) => (
                  <AssignmentCard key={a.id} assignment={a} />
                ))}
              </div>
            </section>

            {completed.length > 0 && (
              <p className="text-sm text-ink/50">{completed.length} completed assignment{completed.length === 1 ? '' : 's'}.</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function AssignmentCard({
  assignment
}: {
  assignment: { id: string; title: string; status: string; sections: { needsInput: boolean }[]; analysis: { overallSignal: number } | null };
}) {
  const flagged = assignment.sections.filter((s) => s.needsInput).length;
  return (
    <Link
      href={`/assignments/${assignment.id}`}
      className="focus-ring block rounded-card border border-line bg-white p-6 shadow-card transition hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-ink/40">{assignment.status.replace('_', ' ')}</span>
        {assignment.analysis && (
          <span className="text-xs text-ink/50">Signal {assignment.analysis.overallSignal}/100</span>
        )}
      </div>
      <h3 className="mt-2 font-display text-lg">{assignment.title}</h3>
      {flagged > 0 && <p className="mt-1 text-sm text-clay">{flagged} section{flagged === 1 ? '' : 's'} need your input</p>}
      <span className="mt-4 flex items-center gap-1 text-sm font-medium text-ink">
        Continue <ArrowRight size={14} />
      </span>
    </Link>
  );
}
