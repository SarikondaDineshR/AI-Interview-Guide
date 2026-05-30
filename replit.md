# AI Chatbot & Interview Copilot

A premium ChatGPT-style SaaS platform with two AI modes: a general document-grounded chatbot, and an Interview Copilot that answers interview questions in-character as a job candidate.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/copilot-web run dev` — run the frontend (port 23784)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19, Vite, Tailwind CSS, shadcn/ui, Framer Motion, wouter
- API: Express 5
- Auth: express-session + bcryptjs (cookie-based session, Google OAuth ready)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- AI: Hermes API (streaming), Pinecone (vector DB), LangChain (RAG)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — Drizzle DB tables (users, bots, documents, conversations, messages)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, bots, documents, conversations, chat, settings)
- `artifacts/api-server/src/middlewares/auth.ts` — Session auth middleware
- `artifacts/copilot-web/src/` — React frontend

## Architecture decisions

- Cookie-based sessions (express-session + connect-pg-simple) rather than JWT — simpler, server-side invalidation
- SSE (Server-Sent Events) for streaming chat — POST endpoint returns `text/event-stream`
- Dummy AI responses until Hermes/Pinecone keys are added — all streaming infrastructure is in place
- File uploads go through multer (memory storage) on the Express server — not through codegen client (multipart)
- Drizzle UUIDs as primary keys for all tables (defaultRandom())
- Bot ownership enforced on every query (AND userId = session.userId)

## Product

- Two AI modes: **Chatbot** (document Q&A, source-grounded) and **Interview Copilot** (first-person interview answers)
- Users sign up, create/edit bots, upload knowledge-base docs, and chat
- ChatGPT-style sidebar with conversation history, bot mode switching, and settings
- Two-panel bot builders with live test chat on the right
- Dark/light/system theme toggle

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- File uploads: use raw `fetch()` + `FormData` — the generated `useUploadDocument` hook doesn't handle multipart
- SSE streaming: use raw `fetch()` + `ReadableStream` — do NOT use `useSendChatMessage`
- After adding API keys (Hermes, Pinecone), implement the real RAG pipeline in `artifacts/api-server/src/routes/chat.ts`
- Run `pnpm --filter @workspace/db run push` after any schema changes
- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec changes

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- `.env.example` — all required environment variables listed
