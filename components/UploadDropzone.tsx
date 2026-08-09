'use client';

import { useCallback, useState } from 'react';
import { UploadCloud, File as FileIcon } from 'lucide-react';
import clsx from 'clsx';

const ACCEPTED = '.pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp,.zip';

export function UploadDropzone({ onFile }: { onFile: (file: File) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<File | null>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      setSelected(file);
      onFile(file);
    },
    [onFile]
  );

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={clsx(
        'focus-ring flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed p-12 text-center transition',
        dragOver ? 'border-clay bg-clay/5' : 'border-line bg-white'
      )}
    >
      <input type="file" accept={ACCEPTED} className="sr-only" onChange={(e) => handleFiles(e.target.files)} />
      {selected ? (
        <>
          <FileIcon className="text-moss" size={28} />
          <p className="mt-3 text-sm font-medium">{selected.name}</p>
          <p className="text-xs text-ink/50">{(selected.size / 1024).toFixed(0)} KB</p>
        </>
      ) : (
        <>
          <UploadCloud className="text-ink/40" size={28} />
          <p className="mt-3 text-sm font-medium">Drag a file here, or click to browse</p>
          <p className="mt-1 text-xs text-ink/50">PDF, DOC, DOCX, PPT, PPTX, TXT, PNG, JPG, WEBP, ZIP</p>
        </>
      )}
    </label>
  );
}
