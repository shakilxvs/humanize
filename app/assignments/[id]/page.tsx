'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Sparkles, ScanText, Loader2, History } from 'lucide-react';
import { DiffView } from '@/components/DiffView';
import { Editor } from '@/components/Editor';

type Signals = { genericLanguage: string; repetition: string; specificity: string; reasoning: string; evidence: string };
type Section = {
  id: string;
  order: number;
  originalText: string;
  currentText: string;
  needsInput: boolean;
  signals: Signals | null;
  issues: string[] | null;
  questions: { id: string; type: string; question: string; reason?: string }[];
  answers: { id: string; questionId: string; answer: string }[];
  reconstructions: { id: string; personalized: string; changes: string[]; potentialUnsupportedClaims: string[]; status: string }[];
};
type Assignment = {
  id: string;
  title: string;
  status: string;
  sections: Section[];
  analysis: { overallSignal: number; confidence: string } | null;
};

export default function AssignmentWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busySection, setBusySection] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/assignments/${id}`);
    const data = await res.json();
    if (res.ok) setAssignment(data.assignment);
    else setError(data.error);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAnalysis() {
    setAnalyzing(true);
    setError(null);
    const res = await fetch(`/api/assignments/${id}/analyze`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    setAnalyzing(false);
    load();
  }

  async function generateQuestions(sectionId: string) {
    setBusySection(sectionId);
    const res = await fetch(`/api/assignments/${id}/sections/${sectionId}/questions`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    setBusySection(null);
    load();
  }

  async function saveAnswer(sectionId: string, questionId: string, type: string) {
    const answer = draftAnswers[questionId]?.trim();
    if (!answer) return;
    await fetch(`/api/assignments/${id}/sections/${sectionId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, answer, type })
    });
    load();
  }

  async function reconstruct(sectionId: string) {
    setBusySection(sectionId);
    const res = await fetch(`/api/assignments/${id}/sections/${sectionId}/reconstruct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style: 'Natural Academic' })
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    setBusySection(null);
    load();
  }

  async function decideReconstruction(sectionId: string, reconstructionId: string, decision: 'accept' | 'reject', editedText?: string) {
    await fetch(`/api/assignments/${id}/sections/${sectionId}/reconstruct`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reconstructionId, decision, editedText })
    });
    load();
  }

  async function saveFinal(html: string) {
    await fetch(`/api/assignments/${id}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'final', content: html })
    });
  }

  if (loading) return <Centered>Loading…</Centered>;
  if (error && !assignment) return <Centered>{error}</Centered>;
  if (!assignment) return null;

  const combinedText = assignment.sections
    .sort((a, b) => a.order - b.order)
    .map((s) => `<p>${escapeHtml(s.currentText)}</p>`)
    .join('\n');

  return (
    <main className="min-h-screen bg-paper px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl">{assignment.title}</h1>
            <p className="mt-1 text-sm text-ink/60 capitalize">{assignment.status.replace('_', ' ')}</p>
          </div>
          {assignment.analysis ? (
            <SignalBadge value={assignment.analysis.overallSignal} confidence={assignment.analysis.confidence} />
          ) : (
            <button
              onClick={runAnalysis}
              disabled={analyzing}
              className="focus-ring flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink/90 disabled:opacity-60"
            >
              {analyzing ? <Loader2 className="animate-spin" size={16} /> : <ScanText size={16} />}
              {analyzing ? 'Analyzing…' : 'Run analysis'}
            </button>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-clay">{error}</p>}

        <div className="mt-8 space-y-6">
          {assignment.sections
            .sort((a, b) => a.order - b.order)
            .map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                busy={busySection === section.id}
                draftAnswers={draftAnswers}
                setDraftAnswers={setDraftAnswers}
                onGenerateQuestions={() => generateQuestions(section.id)}
                onSaveAnswer={(qid, type) => saveAnswer(section.id, qid, type)}
                onReconstruct={() => reconstruct(section.id)}
                onDecide={(reconId, decision, editedText) => decideReconstruction(section.id, reconId, decision, editedText)}
              />
            ))}
        </div>

        {assignment.status !== 'draft' && (
          <div className="mt-12">
            <h2 className="flex items-center gap-2 font-display text-2xl">
              <History size={18} /> Final content
            </h2>
            <p className="mt-1 text-sm text-ink/60">Edit freely, then save your final version.</p>
            <div className="mt-4">
              <Editor initialHtml={combinedText} onChange={() => undefined} />
            </div>
            <SaveFinalButton getHtml={() => combinedText} onSave={saveFinal} />
          </div>
        )}
      </div>
    </main>
  );
}

function SaveFinalButton({ getHtml, onSave }: { getHtml: () => string; onSave: (html: string) => Promise<void> }) {
  const [saved, setSaved] = useState(false);
  return (
    <button
      onClick={async () => {
        await onSave(document.querySelector('[contenteditable]')?.innerHTML ?? getHtml());
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }}
      className="focus-ring mt-4 rounded-full bg-clay px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
    >
      {saved ? 'Saved' : 'Save final version'}
    </button>
  );
}

function SectionCard({
  section,
  busy,
  draftAnswers,
  setDraftAnswers,
  onGenerateQuestions,
  onSaveAnswer,
  onReconstruct,
  onDecide
}: {
  section: Section;
  busy: boolean;
  draftAnswers: Record<string, string>;
  setDraftAnswers: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  onGenerateQuestions: () => void;
  onSaveAnswer: (questionId: string, type: string) => void;
  onReconstruct: () => void;
  onDecide: (reconstructionId: string, decision: 'accept' | 'reject', editedText?: string) => void;
}) {
  const latestRecon = section.reconstructions[0];
  const answeredQuestionIds = new Set(section.answers.map((a) => a.questionId));

  return (
    <div className="rounded-card border border-line bg-white p-6 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <p className="whitespace-pre-wrap text-sm">{section.currentText}</p>
        {section.needsInput && <span className="shrink-0 rounded-full bg-clay/10 px-2.5 py-1 text-xs text-clay">Needs input</span>}
      </div>

      {section.signals && (
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(section.signals).map(([k, v]) => (
            <span key={k} className="rounded-full bg-canvas px-2.5 py-1 text-xs text-ink/60">
              {k}: {v}
            </span>
          ))}
        </div>
      )}

      {section.needsInput && latestRecon?.status !== 'accepted' && latestRecon?.status !== 'edited' && (
        <div className="mt-4">
          {section.questions.length === 0 ? (
            <button
              onClick={onGenerateQuestions}
              disabled={busy}
              className="focus-ring flex items-center gap-2 rounded-full bg-moss px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} Humanize
            </button>
          ) : !latestRecon ? (
            <div className="space-y-3">
              {section.questions.map((q) => (
                <div key={q.id}>
                  <label className="text-xs font-medium text-ink/70">{q.question}</label>
                  <textarea
                    defaultValue={section.answers.find((a) => a.questionId === q.id)?.answer ?? ''}
                    onChange={(e) => setDraftAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    onBlur={() => onSaveAnswer(q.id, q.type)}
                    rows={2}
                    className="focus-ring mt-1 w-full rounded-xl border border-line p-2 text-sm"
                    placeholder="Your answer…"
                  />
                </div>
              ))}
              <button
                onClick={onReconstruct}
                disabled={busy || answeredQuestionIds.size === 0}
                className="focus-ring mt-2 flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper hover:bg-ink/90 disabled:opacity-40"
              >
                {busy ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} Reconstruct section
              </button>
            </div>
          ) : (
            <div className="mt-2">
              <DiffView
                original={section.originalText}
                personalized={latestRecon.personalized}
                changes={latestRecon.changes ?? []}
                unsupported={latestRecon.potentialUnsupportedClaims ?? []}
                onAccept={(finalText) => onDecide(latestRecon.id, 'accept', finalText)}
                onReject={() => onDecide(latestRecon.id, 'reject')}
                onRegenerate={onReconstruct}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SignalBadge({ value, confidence }: { value: number; confidence: string }) {
  return (
    <div className="rounded-card border border-line bg-white px-5 py-3 text-right shadow-card">
      <p className="font-display text-2xl">{value}/100</p>
      <p className="text-xs text-ink/50">AI-like writing signal &middot; {confidence} confidence</p>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-paper text-sm text-ink/60">{children}</main>;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
