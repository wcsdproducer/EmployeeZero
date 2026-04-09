# Employee Zero — Agent Instructions

Read this entire file before starting any task.

## Project Identity

**Employee Zero** is an AI Employee Platform. Businesses hire AI "employees" — specialized agents that handle customer support, operations, competitor research, meeting prep, and more.

- **Stack**: Next.js + TypeScript + Tailwind CSS + Radix UI + Google GenAI (Gemini)
- **Firebase Project**: `employee-zero-production`
- **Deployed via**: Firebase App Hosting
- **Dev server**: `npm run dev` (port 3003)
- **Build**: `npm run build` (uses --max-old-space-size=3584)

## Architecture

```
src/
├── app/              # Next.js App Router
│   ├── api/          # API routes
│   ├── chat/         # AI chat interface
│   ├── connections/  # OAuth / service integrations
│   ├── dashboard/    # Main dashboard
│   ├── hiring-hall/  # Browse & hire AI employees
│   ├── onboarding/   # User onboarding flow
│   ├── settings/     # Account settings
│   ├── specialists/  # AI specialist pages
│   ├── tools/        # Built-in tools (email drafter, ROI calculator, etc.)
│   ├── automate/     # Task automation
│   ├── use-cases/    # Use case landing pages
│   └── login/        # Authentication
├── components/       # Shared React components
├── hooks/            # Custom React hooks
└── lib/              # Utilities, Firebase config, AI helpers
```

## Key Conventions

- Uses `@google/genai` (Firebase AI Logic / Gemini) directly, NOT Genkit
- Firebase Auth for user sessions
- Firestore collections: `clients`, `leads` (in employee-zero-production project)
- Tailwind CSS + Radix UI for components
- `@/` path alias maps to `./src/*`

## Build & Deploy

```bash
npm run dev              # Local dev (port 3003)
npm run build            # Production build
npm run lint             # ESLint
git push                 # Triggers Firebase App Hosting deploy
```

## Owner

- **Jack Freeman** (John Freeman / wcsdproducer)
- Part of the GravityClaw ecosystem
- Mission Control monitors this workspace
- Operations data in `gravity-claw-brain` Firestore

## Self-Correcting Rules Engine

### How it works

1. When the user corrects you or you make a mistake, **immediately append a new rule** to the "Learned Rules" section below.
2. Format: `N. [CATEGORY] Never/Always do X — because Y.`
3. Categories: `[STYLE]`, `[CODE]`, `[ARCH]`, `[TOOL]`, `[PROCESS]`, `[DATA]`, `[UX]`, `[OTHER]`
4. Before starting any task, scan all rules for relevant constraints.
5. Higher-numbered rules win over lower-numbered ones.

---

## Learned Rules

<!-- New rules are appended below this line. Do not edit above this section. -->
1. [CODE] Always use `npm` — project uses package-lock.json.
2. [ARCH] Uses @google/genai directly, NOT Genkit — different from other GravityClaw projects.
3. [PROCESS] Always run `npm run build` before considering a task complete.
