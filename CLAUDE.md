@AGENTS.md

# Communication
Always respond in English, regardless of the language the user writes in.

# Meeting Intelligence — Project Guide

## Overview
Next.js 16 App Router web app: upload meeting recordings → AI transcription → summarization → task extraction → assign tasks to employees by expertise. Employees log in to view their tasks.

## Commands
```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm run db:push      # Push Drizzle schema to Neon (requires .env.local)
npm run db:studio    # Open Drizzle Studio
npx workflow web     # Workflow observability dashboard
npx workflow health  # Verify workflow endpoint is reachable
npx tsc --noEmit     # Type check
```

## Project Structure
```
app/
  (app)/              # Authenticated app (sidebar layout)
    dashboard/        # Overview stats
    upload/           # Drag & drop audio + YouTube URL
    meetings/         # List + [id] detail (transcript, summary, tasks)
    tasks/            # Employee kanban — my tasks only
    admin/            # Admin-only (redirects non-admins)
      employees/      # Google Workspace sync + expertise tag editor
      tasks/          # All tasks overview
  api/
    upload/           # POST: store to Blob, start workflow
    meetings/[id]/    # GET: meeting + tasks (status polling)
    tasks/[id]/       # PATCH: update task status
    admin/
      employees/      # GET all, PATCH [id] expertise[]
      sync-employees/ # POST: Google Workspace sync
  sign-in/[[...sign-in]]/
  sign-up/[[...sign-up]]/

db/
  schema.ts           # Drizzle: meetings, tasks, employees
  index.ts            # Lazy getDb() — never instantiate at module scope

lib/
  clerk.ts            # isAdmin(userId) helper
  google-workspace.ts # syncGoogleWorkspaceEmployees()

workflows/
  process-meeting.ts  # Durable 6-step AI pipeline

components/
  processing-status.tsx   # Polls /api/meetings/[id] every 3s, progress bar
  task-status-toggle.tsx  # todo → in_progress → completed toggle
```

## Key Architecture

### Auth — Clerk v7
- File is `proxy.ts` (Next.js 16 renamed middleware → proxy)
- Admin: `user.publicMetadata.role === "admin"` — set manually in Clerk dashboard
- Exclude `.well-known/workflow/*` from proxy matcher (already done)

### Database — Neon + Drizzle
- `getDb()` is a lazy singleton — never call `neon()` at module scope (breaks `next build`)
- Tables: `meetings` (7-state status enum), `tasks`, `employees`

### Processing Workflow
All logic in `"use step"` functions — `"use workflow"` is pure orchestration only.

```
fetchAudioStep       → Vercel Blob get() or YouTube via ytdl-core
transcribeAudioStep  → experimental_transcribe() + openai.transcription("whisper-1")
generateSummaryStep  → generateText + Output.object() via AI Gateway  ┐ parallel
extractTasksStep     → generateText + Output.object() via AI Gateway  ┘
assignTasksStep      → keyword scoring: expertise[] + role vs task keywords
finalizeMeetingStep  → status = "completed", save transcript + summary
```

### AI SDK v6 Patterns
- Structured output: `generateText` + `Output.object({ schema })` → result in `.output`
- Transcription: `experimental_transcribe` takes `ArrayBuffer` directly as `audio`
- Models: `"anthropic/claude-sonnet-4.6"` (dots not hyphens in version numbers)
- Whisper: uses default `openai` instance — AI Gateway does NOT support audio transcription

### Google Workspace
- API version string: `"directory_v1"` (not `"directoryV1"`)
- Expertise tags start empty; admins fill them in via `/admin/employees`
- Task assignment: +2 per expertise match, +1 per role token match

## Environment Variables
See `.env.local.example`. Key vars:
- `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `DATABASE_URL` (Neon)
- `BLOB_READ_WRITE_TOKEN`
- `OPENAI_API_KEY` (Whisper — not routed through AI Gateway)
- `GOOGLE_SERVICE_ACCOUNT_JSON` + `GOOGLE_ADMIN_EMAIL`
- AI Gateway OIDC: auto on Vercel, locally via `vercel env pull`

## Common Pitfalls
- `generateObject` removed in AI SDK v6 — use `generateText` + `Output.object()`
- `@vercel/blob` `get()` returns union `{ statusCode: 200 | 304 }` — check `statusCode === 200`, use `blob.contentType`, read stream via `.getReader()`
- `start()` cannot be called directly in workflow context — must be inside a `"use step"` function
- `auth()` and `clerkClient()` are both async in Clerk v7 — always `await`
