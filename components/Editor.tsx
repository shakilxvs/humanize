'use client';

import { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Quote, Heading2, Undo2, Redo2 } from 'lucide-react';

// A production-lean rich text editor. Uses contentEditable + the browser's
// native editing commands rather than a heavier editor framework, to keep
// the vertical slice dependency-light. Swap for Tiptap/Lexical later if
// richer table/image editing is needed.
export function Editor({ initialHtml, onChange }: { initialHtml: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [counts, setCounts] = useState({ words: 0, chars: 0 });

  useEffect(() => {
    if (ref.current && ref.current.innerHTML === '') {
      ref.current.innerHTML = initialHtml;
      updateCounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHtml]);

  function updateCounts() {
    const text = ref.current?.innerText ?? '';
    setCounts({ words: text.split(/\s+/).filter(Boolean).length, chars: text.length });
  }

  function exec(command: string, value?: string) {
    document.execCommand(command, false, value);
    ref.current?.focus();
    handleInput();
  }

  function handleInput() {
    updateCounts();
    onChange(ref.current?.innerHTML ?? '');
  }

  return (
    <div className="rounded-card border border-line bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-line p-2">
        <ToolButton icon={Heading2} label="Heading" onClick={() => exec('formatBlock', 'H2')} />
        <ToolButton icon={Bold} label="Bold" onClick={() => exec('bold')} />
        <ToolButton icon={Italic} label="Italic" onClick={() => exec('italic')} />
        <ToolButton icon={Underline} label="Underline" onClick={() => exec('underline')} />
        <ToolButton icon={List} label="Bullet list" onClick={() => exec('insertUnorderedList')} />
        <ToolButton icon={ListOrdered} label="Numbered list" onClick={() => exec('insertOrderedList')} />
        <ToolButton icon={Quote} label="Quote" onClick={() => exec('formatBlock', 'BLOCKQUOTE')} />
        <div className="mx-1 h-5 w-px bg-line" />
        <ToolButton icon={Undo2} label="Undo" onClick={() => exec('undo')} />
        <ToolButton icon={Redo2} label="Redo" onClick={() => exec('redo')} />
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="focus-ring min-h-[320px] max-w-none p-6 text-sm leading-relaxed [&_blockquote]:border-l-2 [&_blockquote]:border-clay [&_blockquote]:pl-4 [&_blockquote]:text-ink/70 [&_h2]:font-display [&_h2]:text-xl [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
      />
      <div className="flex justify-end gap-4 border-t border-line px-4 py-2 text-xs text-ink/50">
        <span>{counts.words} words</span>
        <span>{counts.chars} characters</span>
      </div>
    </div>
  );
}

function ToolButton({ icon: Icon, label, onClick }: { icon: typeof Bold; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="focus-ring rounded-lg p-2 text-ink/70 hover:bg-canvas hover:text-ink"
    >
      <Icon size={16} />
    </button>
  );
}
