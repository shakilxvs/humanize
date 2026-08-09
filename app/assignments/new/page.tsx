'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadDropzone } from '@/components/UploadDropzone';
import { ClipboardPaste, Upload, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

export default function NewAssignmentPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'paste' | 'upload'>('paste');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === 'paste' && !text.trim()) {
      setError('Paste some text first.');
      return;
    }
    if (mode === 'upload' && !file) {
      setError('Choose a file first.');
      return;
    }

    setBusy('Creating assignment…');
    try {
      const createRes = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || (mode === 'upload' ? file!.name : 'Untitled assignment'),
          sourceType: mode === 'paste' ? 'paste' : guessSourceType(file!.type)
        })
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        setError(createData.error ?? 'Could not create the assignment.');
        return;
      }
      const assignmentId = createData.assignment.id as string;

      setBusy('Extracting content…');
      let extractRes: Response;
      if (mode === 'paste') {
        extractRes = await fetch(`/api/assignments/${assignmentId}/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
      } else {
        const form = new FormData();
        form.append('file', file!);
        extractRes = await fetch(`/api/assignments/${assignmentId}/extract`, { method: 'POST', body: form });
      }

      const extractData = await extractRes.json();
      if (!extractRes.ok) {
        setError(extractData.error ?? 'That document could not be processed.');
        return;
      }

      router.push(`/assignments/${assignmentId}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl">New assignment</h1>
        <p className="mt-1 text-sm text-ink/60">Paste your draft, or upload a file.</p>

        <div className="mt-6 flex gap-2 rounded-full border border-line bg-white p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode('paste')}
            className={clsx('flex flex-1 items-center justify-center gap-2 rounded-full py-2', mode === 'paste' && 'bg-ink text-paper')}
          >
            <ClipboardPaste size={15} /> Paste text
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={clsx('flex flex-1 items-center justify-center gap-2 rounded-full py-2', mode === 'upload' && 'bg-ink text-paper')}
          >
            <Upload size={15} /> Upload file
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium" htmlFor="title">Title (optional)</label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Research Paper — Social Media"
              className="focus-ring mt-1 w-full rounded-xl border border-line px-3 py-2"
            />
          </div>

          {mode === 'paste' ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder="Paste your draft here…"
              className="focus-ring w-full rounded-card border border-line bg-white p-4 text-sm"
            />
          ) : (
            <UploadDropzone onFile={setFile} />
          )}

          {error && <p className="text-sm text-clay">{error}</p>}

          <button
            type="submit"
            disabled={!!busy}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-medium text-paper hover:bg-ink/90 disabled:opacity-60"
          >
            {busy ?? (
              <>
                Continue <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

function guessSourceType(mime: string): 'pdf' | 'docx' | 'pptx' | 'txt' | 'image' | 'zip' {
  if (mime === 'application/pdf') return 'pdf';
  if (mime.includes('wordprocessingml')) return 'docx';
  if (mime.includes('presentation')) return 'pptx';
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/zip') return 'zip';
  return 'txt';
}
