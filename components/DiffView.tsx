'use client';

import { Check, X, RotateCcw, Pencil } from 'lucide-react';
import { useState } from 'react';

export function DiffView({
  original,
  personalized,
  changes,
  unsupported,
  onAccept,
  onReject,
  onRegenerate
}: {
  original: string;
  personalized: string;
  changes: string[];
  unsupported: string[];
  onAccept: (finalText: string) => void;
  onReject: () => void;
  onRegenerate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(personalized);

  return (
    <div className="rounded-card border border-line bg-white p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Original</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink/70">{original}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-clay">Personalized</p>
          {editing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={6}
              className="focus-ring mt-2 w-full rounded-xl border border-line p-2 text-sm"
            />
          ) : (
            <p className="mt-2 whitespace-pre-wrap text-sm">{draft}</p>
          )}
        </div>
      </div>

      {changes.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {changes.map((c, i) => (
            <span key={i} className="rounded-full bg-moss/10 px-3 py-1 text-xs text-moss">
              {c}
            </span>
          ))}
        </div>
      )}

      {unsupported.length > 0 && (
        <div className="mt-3 rounded-xl bg-clay/10 p-3 text-xs text-clay">
          <p className="font-medium">Still needs support:</p>
          <ul className="mt-1 list-disc pl-4">
            {unsupported.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => onAccept(draft)}
          className="focus-ring flex items-center gap-1.5 rounded-full bg-moss px-4 py-2 text-xs font-medium text-white hover:opacity-90"
        >
          <Check size={14} /> Accept
        </button>
        <button
          onClick={() => setEditing((v) => !v)}
          className="focus-ring flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-xs font-medium hover:bg-canvas"
        >
          <Pencil size={14} /> {editing ? 'Done editing' : 'Edit'}
        </button>
        <button
          onClick={onRegenerate}
          className="focus-ring flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-xs font-medium hover:bg-canvas"
        >
          <RotateCcw size={14} /> Try again
        </button>
        <button
          onClick={onReject}
          className="focus-ring flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-xs font-medium text-clay hover:bg-clay/5"
        >
          <X size={14} /> Reject
        </button>
      </div>
    </div>
  );
}
