# Architect Studio

A full-stack web application for UK property/home extension planning and 3D visualization, built with React + Vite (frontend) and Vercel serverless functions (backend).

## Cursor Cloud specific instructions

### Architecture overview

- **Frontend**: React 19, Vite 7, Tailwind CSS 4, shadcn/ui (Radix), Three.js. Served on port 5000.
- **Backend**: Vercel serverless functions in `api/` directory (file-based routing). No Express/Fastify server. During dev, Vite proxies `/api` to `localhost:3000`.
- **Database**: Neon PostgreSQL via `@neondatabase/serverless` + Drizzle ORM. Schema in `shared/schema.ts`.
- **Auth**: Google OAuth + JWT (jose). No local auth.
- **External APIs**: Google Gemini (image gen), Meshy (3D), TRELLIS/Gradio (3D), Stripe (billing), Perplexity (planning search).

### Running the dev server

```bash
npm run dev
```

Starts Vite on port 5000 with HMR. Public pages (landing, pricing) work without backend. Authenticated pages (projects, planning, upload) require `DATABASE_URL` and `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` to be set.

### Key commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server (port 5000) |
| `npm run build` | Production build to `dist/public` |
| `npm run check` | TypeScript type checking (`tsc`) |
| `npm run db:push` | Push Drizzle schema to database |
| `npm run db:generate` | Generate Drizzle migrations |

### Known issues

- `npm run check` reports ~13 pre-existing TypeScript errors (type mismatches in `api/`, `lib/`, and `client/` code). These do not block the build or dev server.
- There is no ESLint or Prettier configuration in the project; `npm run check` (tsc) is the only lint-like command available.

### Environment variables

Copy `.env.example` to `.env` and fill in values. At minimum, `SESSION_SECRET` must be set for the dev server to start. See `DEPLOYMENT.md` for full variable documentation.

### Gotchas

- The `api/` directory uses Vercel's file-based serverless routing. These functions are not served locally by the Vite dev server — they only run when deployed to Vercel (or via `vercel dev`). The Vite proxy to `localhost:3000` will return errors unless a separate backend is running on that port.
- The project uses npm (lockfile: `package-lock.json`), not pnpm or yarn.
