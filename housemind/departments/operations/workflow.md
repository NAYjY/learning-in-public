# HouseMind — Full Company Workflow

## What Happened (Chronological)

```
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 1: LEADERSHIP MEETING                                       │
│                                                                     │
│  Founder Direction                                                  │
│       │                                                             │
│       ▼                                                             │
│  Multi-Agent Meeting (4 rounds of debate)                           │
│       │                                                             │
│       ├── Marketing Agent ──┐                                       │
│       ├── Operations Agent ─┤── Each argues their position          │
│       ├── Tech Agent ───────┤                                       │
│       └── PM Agent ─────────┘── Summarizes + action plan            │
│                                                                     │
│  Outcome: Architect-first, invite-only beta.                        │
│           Co-owner invites architects personally.                   │
│           MVP = Next.js + Postgres + S3                             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 2: INDEPENDENT DEPARTMENT WORK                               │
│                                                                     │
│  Each department runs 3-phase deep work (research → work → report)  │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Marketing    │  │  Operations  │  │  Tech        │              │
│  │  Beta launch  │  │  Catalog     │  │  MVP arch    │              │
│  │  plan         │  │  curation    │  │  report      │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                  │                       │
│         ▼                 ▼                  ▼                       │
│     report.md         report.md          report.md                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 3: TECH BUILDS MVP (Wave 1)                                  │
│                                                                     │
│  Based on tech report, actually built the app:                      │
│                                                                     │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ DB      │ │ Auth     │ │ Catalog  │ │ Projects │               │
│  │ Schema  │ │ (invite+ │ │ (filter, │ │ (boards, │               │
│  │ 7 tbls  │ │  JWT)    │ │  req avl)│ │  comment)│               │
│  └─────────┘ └──────────┘ └──────────┘ └──────────┘               │
│                                                                     │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐                            │
│  │Feedback │ │ Seed     │ │ Tests    │                            │
│  │ Widget  │ │ 20 prods │ │ 23/23 ✓  │                            │
│  └─────────┘ └──────────┘ └──────────┘                            │
│                                                                     │
│  Stack: Next.js 16 + TS + Tailwind + PostgreSQL + jose              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 4: CROSS-DEPARTMENT REVIEW                                   │
│                                                                     │
│  Tech produces test report (23/23 passing)                          │
│                                                                     │
│  Marketing reviews build ──► Feedback:                              │
│     • Stronger landing page value prop                              │
│     • Welcome checklist + email drip                                │
│     • Architect testimonials needed                                 │
│     • Better product images + filters                               │
│                                                                     │
│  Operations reviews build ──► Feedback:                             │
│     • Need admin CRUD for products                                  │
│     • Need invite dashboard                                        │
│     • Need onboarding funnel tracking                               │
│     • Need availability request logging                             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 5: PM SYNTHESIS                                              │
│                                                                     │
│  PM reads all 3 updated reports ──► Unified Action Plan             │
│                                                                     │
│  P0: Catalog data (W2), Role labels (W3), Funnel (W4), Checklist   │
│  P1: Admin tools, invite dash, notifications (Wave 2)               │
│  P2: Analytics dashboards (Wave 5+)                                 │
│                                                                     │
│  Founder decisions: catalog scale, notifications, budget            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  NEXT: WAVE 2                                                       │
│                                                                     │
│  Tech ──► Funnel tracking, admin tools, welcome checklist           │
│  Marketing ──► Copy, wireframes, email campaigns                    │
│  Operations ──► Curate 100-150 real products                        │
│  Founder ──► 3 blocked decisions                                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Agent System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        AGENT SYSTEM                              │
│                                                                  │
│  department.js ── Top-level department agents (flat)              │
│     ├── tech      (Head of Tech)                                 │
│     ├── marketing (Head of Marketing)                            │
│     ├── operations(Head of Operations)                           │
│     └── pm        (Product Manager — synthesizes all)            │
│                                                                  │
│  team.js ── Sub-agent teams (hierarchical)                       │
│     └── tech team (Head of Tech orchestrates):                   │
│           ├── Dev          writes code, implements features       │
│           ├── Test & QA    writes tests, validates quality        │
│           ├── Code Review  reviews code for patterns + standards  │
│           └── Security     audits for OWASP, auth, injection     │
│                                                                  │
│  Workflow:                                                       │
│     Head assigns task ──► Dev builds                             │
│                       ──► QA tests                               │
│                       ──► Code Review reviews                    │
│                       ──► Security audits                        │
│                       ──► Head writes final report               │
│                                                                  │
│  run.js ── Multi-agent debate meeting (original)                 │
└──────────────────────────────────────────────────────────────────┘
```
