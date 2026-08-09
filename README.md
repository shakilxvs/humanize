# Humanize

AI-assisted writing personalization and authenticity support for students.
Not a detector-bypass tool: it analyzes a draft, finds where the writer's
own thinking is missing, asks targeted questions, and rebuilds those
sections from the student's real answers.

This repository implements the **core vertical slice** end-to-end with
real, working code — no mocked AI responses, no fake upload processing.
It is a starting production codebase, not the full 50-section spec. See
**Roadmap** below for what is intentionally not built yet, and why.

## What works right now

- Email/password auth (NextAuth + Prisma), private per-user assignments
- Paste text, or upload **TXT / PDF / DOCX** (real extraction — pdf-parse, mammoth)
- AI analysis with a real provider call (writing-style signal + per-section issues), validated with Zod
- Multi-provider fallback: **OpenRouter** (configured as your primary pick), plus working implementations for **Anthropic, Gemini, Groq, DeepSeek** — each activates automatically the moment its API key is set, no code changes needed
- Humanize flow: generate targeted questions per flagged section → student answers → AI reconstruction using only those answers
- Side-by-side original vs. personalized review with Accept / Edit / Reject / Try again
- Rich text editor (headings, bold/italic/underline, lists, blockquotes, undo/redo, live word/char count)
- Version history (`original`, `final` versions saved; `analyzed`/`personalized`/`edited` labels supported by the API)
- IDOR-safe ownership checks on every assignment/section route
- Prompt-injection boundary: document/answer text is always passed as delimited DATA in the user message, never merged into the system instruction (tested)
- Friendly error messages everywhere; technical detail only in server logs, never sent to the client
- Centralized plan/usage limits (`lib/plans.ts`) enforced on assignment creation and file size
- `.env.example` with names only, `.gitignore` excludes all secrets and local DB files

## Roadmap — not implemented yet (intentionally, not faked)

Building all of these for real would roughly triple the size of this
change. Rather than stub them out to look done, each is either absent
from the UI or clearly marked unavailable:

- **PPTX / DOC / ZIP / image OCR** extraction — the extractor rejects
  these with a clear "not supported in this build yet" message instead of
  returning empty or fabricated content. `lib/document/extract.ts` is
  structured so adding a new extractor is a single new file.
- **Search/citation providers** (Tavily / Serper / You.com) — not wired up.
  No fake sources are ever returned; add `lib/search/` following the same
  provider-abstraction pattern as `lib/ai/provider.ts`.
- **Durable file storage** — uploaded file bytes are processed in-memory
  and only metadata is persisted (`DocumentFile`). Add Vercel Blob or S3
  and write to `storagePath` before going to production with real uploads.
- **Admin dashboard**, **usage/cost analytics UI**, **Match My Writing
  Style** analysis, **"Match My Writing Style"** fingerprinting, and the
  standalone SEO pages (`/how-it-works`, `/features`, `/privacy`, `/terms`)
  are not built — the landing page currently covers this content inline.
- **Test coverage** here covers AI-output schema validation and the
  prompt-injection boundary. Auth/authorization, ZIP-bomb protection, and
  usage-limit tests are not yet written — the routes enforce these (see
  `lib/session.ts`, `lib/plans.ts`) but are not yet asserted by tests.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, NEXTAUTH_SECRET, and at least one AI provider key
npx prisma db push
npm run dev
```

`NEXTAUTH_SECRET`: generate with `openssl rand -base64 32`.

You need a Postgres database (Vercel Postgres, Neon, and Supabase all have
free tiers) and **at least one** of `OPENROUTER_API_KEY`,
`ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`
for the app to function past sign-up.

## Deploying: GitHub → Vercel

1. Push this repository to GitHub.
2. Import it into Vercel.
3. In **Vercel → Project → Settings → Environment Variables**, add every
   variable listed in `.env.example` with real values. Never put secret
   keys in a `NEXT_PUBLIC_*` variable — none of the AI/DB/auth secrets are
   read on the client in this codebase.
4. Add a `postinstall` step (or a Vercel Build Command) that runs
   `npx prisma generate && npx prisma migrate deploy` (or `db push` if
   you're not using migrations) so the schema is applied on deploy.
5. Deploy. `npm run build` must succeed — this was written for a
   **network-disabled sandbox and has not been build-verified**; run
   `npm run typecheck && npm run build` locally before your first deploy
   and fix anything version-drift turns up (see note below).

### About the unverified build

This code was generated without npm/network access, so I could not run
`npm install`, `npm run build`, or the test suite myself. I've kept
dependency versions pinned to versions I'm confident are mutually
compatible (Next 14.2, NextAuth 4.24, Prisma 5.19), but please run:

```bash
npm install
npm run typecheck
npm run lint
npm run build
npm run test
```

and treat the first pass as a real code review, not a rubber stamp.

## AI provider setup

Add any subset of these to enable a provider — the fallback chain in
`lib/ai/provider.ts` skips providers with no key configured, in the order
set by `AI_PROVIDER_ORDER`:

| Env var | Provider |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter (multi-model fallback) |
| `ANTHROPIC_API_KEY` | Anthropic Claude |
| `GOOGLE_API_KEY` | Google Gemini |
| `GROQ_API_KEY` | Groq (fast/cheap) |
| `DEEPSEEK_API_KEY` | DeepSeek |

Prompts live in `lib/ai/prompts/*.v1.ts`, versioned and separate from the
API routes. Every AI response is parsed and validated with Zod
(`lib/schema/ai-output.ts`) before it touches the database.

## Project structure

```
app/                  Next.js App Router pages + API routes
  api/assignments/    Assignment CRUD, extract, analyze, questions, answers, reconstruct, versions
lib/ai/               Provider abstraction, fallback logic, versioned prompts
lib/document/         Document extraction (txt/pdf/docx real; others documented as not-yet-built)
lib/schema/           Zod schemas for AI output
lib/session.ts         Auth + ownership guards (IDOR protection)
lib/plans.ts            Centralized pricing/limits config
components/            UploadDropzone, Editor, DiffView
prisma/schema.prisma    Full data model (users, assignments, sections, questions, answers, reconstructions, versions, AI/usage logs)
tests/                  Zod validation + prompt-injection boundary tests
```

## Footer credit

Per the product brief, the footer credits "Shakil" (shakilxvs.com,
Instagram, Facebook) — update or remove in `app/page.tsx` if that
attribution isn't yours to use.
