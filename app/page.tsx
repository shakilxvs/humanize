import Link from 'next/link';
import {
  Upload,
  ScanText,
  MessagesSquare,
  Sparkles,
  Columns2,
  Search,
  ShieldCheck,
  ArrowRight,
  Quote
} from 'lucide-react';

const steps = [
  {
    icon: Upload,
    title: 'Upload anything',
    body: 'Paste your draft or drop a PDF, Word doc, slide deck, or scanned page. Humanize reads it and pulls out the actual content.'
  },
  {
    icon: ScanText,
    title: 'See the writing signal',
    body: 'An internal writing-style estimate flags generic phrasing, thin reasoning, and claims with no support — section by section.'
  },
  {
    icon: MessagesSquare,
    title: 'Answer real questions',
    body: 'For each flagged section, Humanize asks what you actually know: your example, your opinion, what your course covered.'
  },
  {
    icon: Sparkles,
    title: 'Rebuild around your answers',
    body: 'Your own words are woven back into the section — nothing invented, nothing you did not say.'
  },
  {
    icon: Columns2,
    title: 'Compare and edit',
    body: 'Review the original next to the personalized version, see exactly what changed and why, then edit freely.'
  }
];

const faqs = [
  {
    q: 'Is this an AI-detector bypass tool?',
    a: 'No. Humanize does not try to evade Turnitin or any AI detector, and makes no claims about detection outcomes. It helps you find where your own thinking is missing from a draft and rebuild those sections around your real answers.'
  },
  {
    q: 'What does the writing-signal score mean?',
    a: 'It is an internal estimate of how generic or formulaic a piece of writing reads — not proof of AI authorship, and not a prediction of what any third-party detector would say.'
  },
  {
    q: 'Will it invent examples or sources for me?',
    a: 'No. Reconstruction only uses the answers you actually provide. If you have not given enough information, Humanize asks another question instead of making something up.'
  },
  {
    q: 'What happens to my documents?',
    a: 'Your assignments are private to your account. See the Privacy page for full detail on storage and retention.'
  }
];

export default function LandingPage() {
  return (
    <main className="bg-paper text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-xl tracking-tight">Humanize</span>
        <nav className="hidden items-center gap-8 text-sm text-ink/70 md:flex">
          <a href="#how-it-works" className="hover:text-ink">How it works</a>
          <a href="#pricing" className="hover:text-ink">Pricing</a>
          <a href="#faq" className="hover:text-ink">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-ink/70 hover:text-ink">Log in</Link>
          <Link
            href="/register"
            className="focus-ring rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/90"
          >
            Start Writing
          </Link>
        </div>
      </header>

      {/* Hero — signature element: an annotated margin note against a real sentence,
          echoing a teacher's handwriting in the margin of an essay. */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
        <div>
          <h1 className="font-display text-4xl leading-[1.1] tracking-tight md:text-5xl">
            Turn AI-assisted drafts into work that reflects your thinking.
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink/70">
            Analyze your draft, discover where your own reasoning is missing, answer targeted
            questions, and build a stronger version around your ideas.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/register"
              className="focus-ring flex items-center gap-2 rounded-full bg-clay px-6 py-3 text-sm font-medium text-paper transition hover:opacity-90"
            >
              Start Writing <ArrowRight size={16} />
            </Link>
            <a href="#how-it-works" className="focus-ring text-sm font-medium text-ink underline underline-offset-4">
              See how it works
            </a>
          </div>
        </div>

        <div className="relative rounded-card border border-line bg-white p-8 shadow-card">
          <p className="font-display text-lg leading-relaxed text-ink/90">
            Social media has significantly affected university students&rsquo; academic
            performance by providing educational resources and improving communication.
          </p>
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-canvas p-4">
            <Quote size={18} className="mt-1 shrink-0 text-clay" />
            <p className="text-sm text-ink/70">
              This makes a general claim with no specific example or reasoning of your own.
              Have you personally used social media for coursework? What happened?
            </p>
          </div>
          <p className="mt-4 text-xs uppercase tracking-wide text-ink/40">Section flagged &middot; needs your input</p>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-line bg-canvas/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl">How it works</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="rounded-card border border-line bg-white p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-moss/10 text-moss">
                    <step.icon size={18} />
                  </span>
                  <span className="text-xs uppercase tracking-wide text-ink/40">Step {i + 1}</span>
                </div>
                <h3 className="mt-4 font-display text-lg">{step.title}</h3>
                <p className="mt-2 text-sm text-ink/70">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Research & sources, privacy */}
      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-20 md:grid-cols-2">
        <div className="rounded-card border border-line bg-white p-8 shadow-card">
          <Search size={20} className="text-clay" />
          <h3 className="mt-4 font-display text-xl">Research &amp; sources</h3>
          <p className="mt-2 text-sm text-ink/70">
            When a claim needs evidence, search for real sources and choose what to cite. Humanize
            never invents a citation or a URL on your behalf.
          </p>
        </div>
        <div className="rounded-card border border-line bg-white p-8 shadow-card">
          <ShieldCheck size={20} className="text-moss" />
          <h3 className="mt-4 font-display text-xl">Privacy by default</h3>
          <p className="mt-2 text-sm text-ink/70">
            Your assignments and answers are private to your account. Nothing is shared or used to
            train models without your say-so.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-y border-line bg-canvas/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl">Pricing</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-card border border-line bg-white p-8 shadow-card">
              <p className="text-xs uppercase tracking-wide text-ink/40">Free</p>
              <p className="mt-2 font-display text-3xl">$0</p>
              <p className="mt-2 text-sm text-ink/70">A few assignments a month, enough to try the full flow.</p>
            </div>
            <div className="rounded-card border border-clay bg-white p-8 shadow-card">
              <p className="text-xs uppercase tracking-wide text-clay">Student Plus</p>
              <p className="mt-2 font-display text-3xl">$9/mo</p>
              <p className="mt-2 text-sm text-ink/70">Higher monthly limits for assignments, questions, and searches.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="font-display text-3xl">Frequently asked</h2>
        <div className="mt-8 divide-y divide-line">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="focus-ring cursor-pointer list-none font-medium">{f.q}</summary>
              <p className="mt-3 text-sm text-ink/70">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-line px-6 py-10 text-sm text-ink/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <span>
            by{' '}
            <a href="https://shakilxvs.com/" className="underline underline-offset-4 hover:text-ink" target="_blank" rel="noreferrer">
              Shakil
            </a>
          </span>
          <div className="flex gap-4">
            <a href="https://www.instagram.com/shakilxvs" target="_blank" rel="noreferrer" className="hover:text-ink">
              Instagram
            </a>
            <a href="https://www.facebook.com/shakilxvso" target="_blank" rel="noreferrer" className="hover:text-ink">
              Facebook
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
