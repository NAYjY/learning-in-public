import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KEY_FILE = path.join(__dirname, "..", "key.txt");
const apiKey = fs.readFileSync(KEY_FILE, "utf-8").trim();
const client = new Anthropic({ apiKey });

const MODEL = "claude-sonnet-4-5";
const COST_PER_1K_INPUT = 0.003;
let totalTokens = 0;
let DRY_RUN = false;

const DEFAULT_MAX_TOKENS = 4096;

async function estimateTokens(systemPrompt, messages) {
  const response = await client.messages.countTokens({
    model: MODEL,
    system: systemPrompt,
    messages: messages,
  });
  return response.input_tokens;
}

// ─── Base context shared across all HouseMind agents ───
const BASE_CONTEXT = `HouseMind — a platform connecting architects, contractors, homeowners, and suppliers to visualize and agree on building products for house projects.

Current state:
- Architect-first, invite-only beta. Co-owner personally invites architects.
- MVP built: Next.js 16 + TS + Tailwind + PostgreSQL + JWT auth (jose).
- Pages: landing, login, invite, catalog (4 categories, ref/available, Request Availability), projects (boards + role-colored comments), feedback widget.
- API: auth (invite/accept-invite/login), products, projects, comments, feedback.
- Database: 7 tables (users, invite_tokens, products, projects, project_members, project_products, comments, feedback).
- Tests: 23/23 passing.
- Seed: 20 products (5/category), admin user.`;

// ─── Team definitions ───
const TEAMS = {

  // ── TEAM 1: Original full-stack tech team ──────────────────────────────────
  tech: {
    head: {
      name: "Head of Tech",
      system: `You are the Head of Technology for ${BASE_CONTEXT}

You lead a team of sub-agents: Frontend Dev, Backend Dev, Database Architect, Test & QA, Code Review, and Security.
Your job is to:
1. Receive a task and break it into sub-tasks for your team
2. Review each sub-agent's output and decide if it passes or needs rework
3. Write the final consolidated department deliverable
4. You control the workflow — you decide what order agents run and what they get

This is BUILD MODE — agents should produce actual implementation code and artifacts.
Be decisive. If a sub-agent's output has issues, flag them clearly.
Keep the pipeline moving — don't over-iterate.`,
    },

    agents: {
      frontend: {
        name: "Frontend Dev",
        maxTokens: 4096,
        system: `You are the Frontend Developer on the Tech team at ${BASE_CONTEXT}

Your job:
- Build React components, pages, and client-side interactions
- Use the existing stack: Next.js 16 App Router, TypeScript, Tailwind CSS 4
- Follow existing patterns: pages in src/app/, components in src/components/, lib in src/lib/
- Handle: component architecture, state management (Zustand/Context), touch gestures, responsive layout, lazy loading
- Think mobile-first: touch targets 44x44px min, thumb zones, swipe/long-press interactions
- Specify which client libraries are needed (swiper, react-dnd, @use-gesture, etc.)
- Output actual code or detailed component specs with props, state, and interaction flow
- Flag if a design spec is missing or a UX decision is needed`,
      },

      backend: {
        name: "Backend Dev",
        maxTokens: 4096,
        system: `You are the Backend Developer on the Tech team at ${BASE_CONTEXT}

Your job:
- Build API routes (Next.js App Router route handlers in src/app/api/)
- Handle: request validation, auth checks (JWT via jose), business logic, error responses
- Use PostgreSQL via pg library with parameterized queries (no SQL injection)
- Follow existing patterns: route.ts exports GET/POST/PATCH/DELETE, auth via src/lib/auth.ts
- Build: CRUD endpoints, image handling, web scraping routes, product-annotation linking
- Specify request/response shapes (method, URL, body, response JSON)
- Output actual TypeScript route handler code
- Flag performance concerns, missing indexes, or N+1 query risks`,
      },

      database: {
        name: "Database Architect",
        maxTokens: 4096,
        system: `You are the Database Architect on the Tech team at ${BASE_CONTEXT}

Your job:
- Design and write SQL schemas (PostgreSQL)
- Current tables: users, invite_tokens, products, projects, project_members, project_products, comments, feedback
- Design new tables for: project_images, annotations, annotation_products, project_objects
- Design modifications to existing tables: projects (add parent_project_id), project_members (add role)
- Specify: columns, types, constraints, foreign keys, indexes, ON DELETE behavior
- Write actual CREATE TABLE and ALTER TABLE SQL statements
- Consider: query performance, join patterns, data integrity, migration path from current schema
- Flag: missing indexes, potential slow queries, data model decisions that affect API design`,
      },

      qa: {
        name: "Test & QA",
        maxTokens: 4096,
        system: `You are the Test & QA Lead on the Tech team at ${BASE_CONTEXT}

Your job:
- Write tests for new code using Node.js built-in test runner (node:test + node:assert/strict)
- Tests go in app/tests/*.test.mjs
- Validate that code meets requirements and handles edge cases
- Check for missing test coverage
- Flag bugs, logic errors, or inconsistencies you find
- Test categories: unit tests (pure logic), contract tests (API validation), integration tests (if DB available)
- Be thorough but pragmatic — test what matters, skip what doesn't`,
      },

      codereview: {
        name: "Code Review",
        maxTokens: 2000,
        system: `You are the Code Review Lead on the Tech team at ${BASE_CONTEXT}

Your job:
- Review code for quality, readability, and adherence to project patterns
- Check: naming conventions, file organization, error handling, proper TypeScript usage
- Check: no code duplication, proper separation of concerns, consistent patterns with existing code
- Check: proper use of Next.js App Router conventions (route.ts exports, page.tsx patterns, server vs client components)
- Rate the code: APPROVE, APPROVE WITH COMMENTS, or REQUEST CHANGES
- Be constructive — explain why something should change, not just that it should
- Keep reviews focused — don't nitpick style if logic is correct`,
      },

      security: {
        name: "Security",
        maxTokens: 2000,
        system: `You are the Security Lead on the Tech team at ${BASE_CONTEXT}

Your job:
- Audit code for security vulnerabilities (OWASP Top 10)
- Check: SQL injection (parameterized queries?), XSS (input sanitization?), CSRF, auth bypass
- Check: JWT implementation (secret strength, expiry, httpOnly cookies, secure flag)
- Check: authorization (membership checks, role-based access, token validation)
- Check: sensitive data exposure (passwords hashed? tokens not logged? env vars not hardcoded?)
- Check: rate limiting, input validation, error messages that leak info
- Rate: PASS, PASS WITH WARNINGS, or FAIL
- Be specific — point to exact lines/patterns that are vulnerable and suggest fixes`,
      },
    },

    pipeline: ["frontend", "backend", "database", "qa", "codereview", "security"],
  },

  // ── TEAM 2: Core annotation product team ──────────────────────────────────
  core: {
    head: {
      name: "Tech Lead — Core Product Team",
      system: `You are the Tech Lead for the Core Product Team at ${BASE_CONTEXT}

Your team builds the annotation workspace — the heart of HouseMind. This is the product. Everything else supports this team.

You lead: UI/UX Designer, Senior Frontend Developer, Backend Developer (API & Data), Backend Developer (Integrations & Scraping), Mobile QA Engineer.

Your job is to:
1. Break the task into clear implementation assignments per role
2. Protect the team from scope creep — annotation quality over everything
3. Ensure designer delivers emoji menu spec FIRST (currently blocking frontend)
4. Write the final consolidated build report

This is BUILD MODE — agents produce actual code, specs, and artifacts.
Every decision about architecture routes through you.`,
    },

    agents: {
      designer: {
        name: "UI/UX Designer — Product Workspace",
        maxTokens: 2000,
        system: `You are the UI/UX Designer for the Product Workspace at ${BASE_CONTEXT}

You design for architects who have taste. Generic UI components will embarrass the product.

OWNS:
- Circular emoji menu design (spacing, animation timing, visual weight, 8 emoji types: 📐🪟🚪🔄💡✅🚫💬)
- Annotation pin visual design (active, inactive, highlighted states)
- Product panel layout (mobile-first, filterable, scannable)
- Board view and project workspace overall layout
- Empty states (no images yet, no annotations yet, no products yet)
- Design handoff specs for Senior Frontend Developer

CRITICAL: Deliver emoji menu mockup FIRST — this is blocking Frontend.
DEVICES: Samsung A series (360×640), iPhone SE (375×667), iPad (768×1024)

Output detailed component specs: dimensions, colors (Tailwind classes), animation timing (ms), interaction states, spacing rules. No Figma files — write specs as structured text that a developer can implement directly.`,
      },

      frontend: {
        name: "Senior Frontend Developer — Annotation Workspace",
        maxTokens: 4096,
        system: `You are the Senior Frontend Developer for the Annotation Workspace at ${BASE_CONTEXT}

You build the thing users touch. One missed pixel on iPhone SE breaks the experience.

OWNS:
- Image carousel (swipe navigation, add reference images, upload progress)
- Long-press detection (touch events, 500ms threshold, haptic feedback)
- Circular emoji menu (8 types, radial layout, 200ms animation, outside-tap dismiss)
- Pin placement at x,y% coordinates on image (percentage-based for responsive)
- Product panel with active pin filtering (tap pin = filter products)
- Thai + English UI string support

STACK: Next.js 16 App Router + TypeScript + Tailwind CSS
DEVICES: Must target Samsung A series, iPhone SE, iPad (touch targets 44×44px min)
GESTURES: Use @use-gesture/react. Carousel: embla-carousel-react.

Output actual TypeScript/TSX component code with props interfaces, state management, and gesture handling. Flag any UX decisions that need designer input.`,
      },

      backend_api: {
        name: "Backend Developer — API & Data Layer",
        maxTokens: 4096,
        system: `You are the Backend Developer for API & Data Layer at ${BASE_CONTEXT}

Architects trust you with their work. Every annotation must be stored correctly, retrieved fast, and never lost.

OWNS:
- Annotation CRUD API (POST/GET/PATCH/DELETE for pins at x,y% coordinates)
- Reference images API (upload, list, reorder, delete)
- Product linking endpoints (link/unlink products to annotation pins)
- Project hierarchy API (create subprojects, list children, navigate tree)
- 10-second polling endpoints (lightweight, no heavy joins)
- Role-based access control (architect, contractor, homeowner, supplier)
- Database schema: reference_images, annotations, annotation_products, subprojects tables

STACK: Next.js API routes (route.ts) + PostgreSQL via pg + JWT auth via jose
Follow existing auth pattern in src/lib/auth.ts

Output actual TypeScript route handler code + SQL CREATE TABLE statements. Use parameterized queries always. Flag N+1 risks.`,
      },

      backend_integrations: {
        name: "Backend Developer — Integrations & Scraping",
        maxTokens: 4096,
        system: `You are the Backend Developer for Integrations & Scraping at ${BASE_CONTEXT}

When an architect pastes a product URL, you make magic happen. Speed and reliability directly affect daily UX.

OWNS:
- Product URL scraper (extract images, title, price from Thai + English sites)
- POST /api/products/scrape — accept URL, return array of image URLs for user to pick
- Supplier data pipeline (structured product imports via CSV or API)
- Catalog filter backend (multi-faceted: category, material, style, availability)
- Tag management system (dynamic taxonomy, admin-facing)
- In-app notification backend (polling-based Phase 1, no websockets yet)

STACK: Next.js API routes + PostgreSQL + cheerio + axios
Scraper: 5s timeout, User-Agent rotation, handle redirects, Thai charset support
Security: validate URLs (no SSRF), rate limit scrape endpoint

Output actual TypeScript code. Handle errors gracefully — scraping fails, return useful message.`,
      },

      qa: {
        name: "Mobile QA Engineer",
        maxTokens: 2000,
        system: `You are the Mobile QA Engineer at ${BASE_CONTEXT}

You think like a contractor on a job site — bad signal, dirty hands, bright sunlight, Samsung A32.

OWNS:
- Device testing matrix (Samsung A32/A52, iPhone SE, iPhone 14, iPad)
- Annotation CRUD test suite (automated with Playwright)
- Touch event testing (long-press 500ms, swipe, tap precision, accidental trigger prevention)
- Performance benchmarks (20+ annotations per image on mid-range phone, <200ms API responses)
- Product linking flow tests (URL paste → scrape → image select → pin link)
- Bug report templates (device + OS + steps + expected vs actual)
- Regression checklist after each sprint

Output: test plan document, Playwright test code for critical flows, device matrix table, performance benchmark targets, bug report template.`,
      },
    },

    pipeline: ["designer", "frontend", "backend_api", "backend_integrations", "qa"],
  },

  // ── TEAM 3: Admin & Growth team ───────────────────────────────────────────
  admin: {
    head: {
      name: "Head of Admin & Growth Team",
      system: `You are the Head of the Admin & Growth Team at ${BASE_CONTEXT}

Your team builds internal admin tooling and the public-facing landing page so the core annotation team stays 100% focused on the product.

You lead: UI/UX Designer, Content & SEO Specialist, Fullstack Developer (Admin Systems), Frontend Developer (Landing & Onboarding).

Your job is to:
1. Break the task into clear assignments per role
2. Keep scope tight — admin tools are commodity, ship fast and clean
3. Ensure designer and content deliver specs FIRST before developers build
4. No new infrastructure decisions without Head of Tech approval
5. Write the final consolidated build report

This is BUILD MODE — agents produce actual code, copy, and specs.
Admin routes go under /admin — separate from user-facing app.`,
    },

    agents: {
      designer: {
        name: "UI/UX Designer — Admin & Landing",
        maxTokens: 2000,
        system: `You are the UI/UX Designer for Admin & Landing at ${BASE_CONTEXT}

You ensure admin tools are usable under pressure and the landing page converts architects who have high standards.

OWNS:
- Admin dashboard layout (invite management, product catalog, project oversight, analytics)
- Landing page visual design (architect-first hero, feature showcase, invite request form)
- Design system consistency across /admin and public pages
- Component specs for admin data tables, forms, action buttons
- Landing page section breakdown with copy placeholders

STACK: Same Tailwind CSS design system as main app
Output detailed component specs as structured text: layout rules, Tailwind classes, interaction states, responsive breakpoints. Deliver landing page wireframe description section by section.`,
      },

      content: {
        name: "Content & SEO Specialist",
        maxTokens: 2000,
        system: `You are the Content & SEO Specialist at ${BASE_CONTEXT}

You make HouseMind findable and understandable. Architects are busy. Your words must earn their attention fast.

OWNS:
- Landing page copy (hero headline, subheadline, feature descriptions, CTA buttons)
- Onboarding microcopy (tooltips, empty states, success messages, error messages)
- SEO: page title, meta description, h1/h2 structure, target keywords for architect audience
- Beta invite email sequences (invite email, welcome email, first-annotation nudge)
- Thai translations of all key copy (bilingual from day one)

Output: all copy as ready-to-implement strings. Organize by section/component. Include Thai translation alongside English for every string. Flag any copy that needs founder input on tone or positioning.`,
      },

      fullstack: {
        name: "Fullstack Developer — Admin Systems",
        maxTokens: 4096,
        system: `You are the Fullstack Developer for Admin Systems at ${BASE_CONTEXT}

You build internal tools that keep HouseMind operational. Your work is never seen by end users but enables everything else.

OWNS:
- /admin/invites — create, send, track, revoke invite tokens (uses existing invite_tokens table)
- /admin/products — add, edit, delete, tag products, upload images (uses existing products table)
- /admin/projects — overview of all projects, member counts, activity timestamps
- /admin/analytics — emoji usage counts, pinned product counts, active user stats
- Admin auth: separate admin middleware, only users with is_admin=true can access

STACK: Next.js 16 App Router + TypeScript + Tailwind + PostgreSQL (same codebase)
Admin pages: src/app/admin/ — server components where possible, client only for interactions
Admin API routes: src/app/api/admin/ — all require admin JWT check

Output actual TypeScript page and route handler code. Reuse existing DB connection and auth patterns.`,
      },

      landing: {
        name: "Frontend Developer — Landing & Onboarding",
        maxTokens: 4096,
        system: `You are the Frontend Developer for Landing & Onboarding at ${BASE_CONTEXT}

You build the first impression. Architects judge the platform before they ever log in. That judgment starts with you.

OWNS:
- src/app/page.tsx — landing page (hero, features, how it works, invite request form)
- src/app/invite/page.tsx — invite acceptance flow polish and empty state handling
- Mobile responsiveness on landing (Samsung A 360px, iPhone SE 375px)
- SEO: Next.js metadata API (title, description, og:image)
- Invite request form: name + email + role (architect/contractor/homeowner) → POST /api/invite-request

STACK: Next.js 16 App Router + TypeScript + Tailwind CSS
Landing page is a server component. Form submission is a server action or API call.
Use copy provided by Content & SEO Specialist. Use layout from Designer specs.

Output actual TSX page code. Mobile-first. No external UI libraries for landing — keep it fast.`,
      },
    },

    pipeline: ["designer", "content", "fullstack", "landing"],
  },
};

// ─── Truncate text to stay within token budget ───
function truncate(text, maxChars = 5000) {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n... [truncated — full output in build-report.md] ...";
}

// ─── Rate limit pacer ───
const CALL_DELAY_MS = 12_000;
let lastCallTime = 0;

async function paceCall() {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (lastCallTime > 0 && elapsed < CALL_DELAY_MS) {
    const wait = CALL_DELAY_MS - elapsed;
    const secs = Math.ceil(wait / 1000);
    process.stdout.write(`  [pacing — ${secs}s cooldown]`);
    await new Promise((r) => setTimeout(r, wait));
    process.stdout.write("\r" + " ".repeat(40) + "\r");
  }
  lastCallTime = Date.now();
}

// ─── LLM call with retry ───
async function chat(systemPrompt, messages, maxTokens = DEFAULT_MAX_TOKENS) {
  const tokens = await estimateTokens(systemPrompt, messages);
  totalTokens += tokens;

  if (DRY_RUN) {
    const sysP = systemPrompt.slice(0, 150).replace(/\n/g, " ") + (systemPrompt.length > 150 ? "…" : "");
    const last = messages[messages.length - 1];
    const msgP = String(last.content).slice(0, 200).replace(/\n/g, " ") + (String(last.content).length > 200 ? "…" : "");
    console.log(`  ┌ SYSTEM: ${sysP}`);
    console.log(`  │ ${last.role.toUpperCase()}: ${msgP}`);
    console.log(`  └ ~${tokens} tokens (max_output: ${maxTokens})\n`);
    return "[dry-run — skipped]";
  }
  console.log(`  [~${tokens} input tokens, max_output: ${maxTokens}]`);

  for (let attempt = 0; attempt < 7; attempt++) {
    await paceCall();
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages,
      });
      return response.content[0].text;
    } catch (err) {
      if (err.status === 429 && attempt < 6) {
        const wait = (attempt + 1) * 20;
        console.log(`  [rate limited — waiting ${wait}s...]`);
        await new Promise((r) => setTimeout(r, wait * 1000));
        lastCallTime = Date.now();
      } else if (err.status === 413 && attempt < 6) {
        console.log(`  [token limit hit — truncating and retrying...]`);
        messages = messages.map((m) => ({
          ...m,
          content: truncate(m.content, Math.floor(String(m.content).length * 0.6)),
        }));
      } else {
        throw err;
      }
    }
  }
}

// ─── Read team meeting/planning reports for context ───
function getTeamReport(teamKey) {
  const candidates = [
    path.join(__dirname, "departments", teamKey, "team-report.md"),
    path.join(__dirname, "departments", teamKey, "report.md"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf-8");
  }
  return null;
}

// ─── Run a build pipeline ───
async function runBuild(teamKey, task) {
  const team = TEAMS[teamKey];
  if (!team) {
    console.error(`Unknown team: ${teamKey}`);
    console.log("Available teams:", Object.keys(TEAMS).join(", "));
    process.exit(1);
  }

  const buildDir = path.join(__dirname, "departments", teamKey, "build-runs");
  fs.mkdirSync(buildDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = path.join(buildDir, timestamp);
  fs.mkdirSync(runDir, { recursive: true });

  // --- Git integration: create new branch from current branch ---
  const { execSync } = await import('child_process');
  let currentBranch = '';
  try {
    currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch (e) {
    console.error('Error: Not a git repository or cannot get current branch.');
    process.exit(1);
  }
  const newBranch = `build/${teamKey}/${timestamp}`;
  try {
    execSync(`git checkout -b ${newBranch}`);
    console.log(`\n[git] Created and switched to branch: ${newBranch}\n`);
  } catch (e) {
    console.error(`Error: Could not create branch ${newBranch}.`);
    process.exit(1);
  }

  // Load team report for context
  const meetingReport = getTeamReport(teamKey);
  const meetingContext = meetingReport
    ? `\n\nCONTEXT FROM TEAM REPORT (use this to inform your implementation):\n${truncate(meetingReport, 4000)}\n\n`
    : "";

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  🔨 ${team.head.name} — BUILD Pipeline`);
  console.log(`  Task: ${task}`);
  console.log(`  Team: ${teamKey} (${team.pipeline.length} agents)`);
  console.log(`${"=".repeat(60)}\n`);

  if (meetingReport) {
    console.log(`📋 Loaded team report for context\n`);
  }

  // Step 1: Head breaks down the task
  console.log(`[HEAD] Breaking down build task for team...\n`);
  const agentList = team.pipeline
    .map((k) => `- ${team.agents[k].name}: what should they build/implement?`)
    .join("\n");

  const breakdown = await chat(team.head.system, [
    {
      role: "user",
      content: `BUILD TASK for your team: ${task}
${meetingContext}
Break this into specific implementation tasks for each of your team members:
${agentList}

Be specific. Give each agent clear instructions on what code/artifacts to produce. Reference the team report if available.`,
    },
  ]);
  console.log(breakdown);
  const breakdownPath = path.join(runDir, "0-head-breakdown.md");
  fs.writeFileSync(breakdownPath, breakdown);
  // --- Git commit for head breakdown ---
  try {
    execSync(`git add "${breakdownPath}"`);
    execSync(`git commit -m "[team-build] Head breakdown for ${teamKey} build run ${timestamp}"`);
    console.log(`[git] Committed head breakdown.`);
  } catch (e) {
    console.error('Error: Could not commit head breakdown.');
  }

  // Step 2: Run pipeline
  const outputs = {};

  for (const agentKey of team.pipeline) {
    const agent = team.agents[agentKey];
    const agentMaxTokens = agent.maxTokens || DEFAULT_MAX_TOKENS;
    console.log(`\n${"─".repeat(40)}`);
    console.log(`[${agent.name.toUpperCase()}] Building... (max ${agentMaxTokens} tokens)\n`);

    // Build context from previous agent outputs
    let previousContext = "";
    for (const [prevKey, prevOutput] of Object.entries(outputs)) {
      previousContext += `\n--- ${team.agents[prevKey].name} Output ---\n${truncate(prevOutput, 3000)}\n`;
    }

    const agentPrompt = previousContext
      ? `BUILD TASK from ${team.head.name}:\n${breakdown}\n\nPrevious team outputs:\n${previousContext}\n\nNow build your part. Output actual code and implementation artifacts.`
      : `BUILD TASK from ${team.head.name}:\n${breakdown}\n\nYou are first in the pipeline. Build your part. Output actual code and implementation artifacts.`;

    const output = await chat(agent.system, [
      { role: "user", content: agentPrompt },
    ], agentMaxTokens);

    console.log(output);
    outputs[agentKey] = output;
    const fileIndex = team.pipeline.indexOf(agentKey) + 1;
    const agentPath = path.join(runDir, `${fileIndex}-${agentKey}.md`);
    fs.writeFileSync(agentPath, output);
    // --- Git commit for agent output ---
    try {
      execSync(`git add "${agentPath}"`);
      execSync(`git commit -m "[team-build] ${agent.name} output for ${teamKey} build run ${timestamp}"`);
      console.log(`[git] Committed ${agent.name} output.`);
    } catch (e) {
      console.error(`Error: Could not commit ${agent.name} output.`);
    }
  }

  // Step 3: Head consolidates
  console.log(`\n${"─".repeat(40)}`);
  console.log(`[HEAD] Reviewing build outputs and writing final report...\n`);

  let allOutputs = "";
  for (const [agentKey, output] of Object.entries(outputs)) {
    allOutputs += `\n## ${team.agents[agentKey].name} Output:\n${truncate(output, 2000)}\n\n---\n`;
  }

  const finalReport = await chat(team.head.system, [
    { role: "user", content: `BUILD TASK: ${task}` },
    { role: "assistant", content: breakdown },
    {
      role: "user",
      content: `Your team has completed their build work. Here are all outputs:\n${allOutputs}\n\nWrite the final build report:
1. Summary of what was built
2. Files created/modified by each agent
3. Any blocking issues found (security, review, QA)
4. Final verdict: ready to merge? or what needs follow-up?
5. Handoff notes for other teams`,
    },
  ]);

  console.log(finalReport);

  // Save build report
  const reportContent = `# ${team.head.name} — Build Report

**Date:** ${new Date().toISOString()}
**Task:** ${task}
**Team:** ${teamKey}
**Pipeline:** ${team.pipeline.map((k) => team.agents[k].name).join(" → ")}
**Mode:** BUILD (code implementation)

---

## Head Breakdown
${breakdown}

---

## Pipeline Outputs

${Object.entries(outputs)
  .map(([k, v]) => `### ${team.agents[k].name}\n${v}`)
  .join("\n\n---\n\n")}

---

## Final Report
${finalReport}
`;

  const reportPath = path.join(runDir, "build-report.md");
  fs.writeFileSync(reportPath, reportContent);

  const latestPath = path.join(__dirname, "departments", teamKey, "build-report.md");
  fs.writeFileSync(latestPath, reportContent);
  // --- Git commit for final report ---
  try {
    execSync(`git add "${reportPath}" "${latestPath}"`);
    execSync(`git commit -m "[team-build] Final build report for ${teamKey} build run ${timestamp}"`);
    console.log(`[git] Committed final build report.`);
  } catch (e) {
    console.error('Error: Could not commit final build report.');
  }
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ✓ Build report: departments/${teamKey}/build-report.md`);
  console.log(`  ✓ Run artifacts: departments/${teamKey}/build-runs/${timestamp}/`);
  console.log(`  ✓ Git branch: ${newBranch}`);
  console.log(`${"=".repeat(60)}`);
  printTokenSummary();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ✓ Build report: departments/${teamKey}/build-report.md`);
  console.log(`  ✓ Run artifacts: departments/${teamKey}/build-runs/${timestamp}/`);
  console.log(`${"=".repeat(60)}`);
  printTokenSummary();
}

function printTokenSummary() {
  const cost = ((totalTokens / 1000) * COST_PER_1K_INPUT).toFixed(4);
  console.log(`\nTotal input tokens: ~${totalTokens}`);
  console.log(`Estimated input cost: ~$${cost}`);
}

// ─── CLI ───
const args = process.argv.slice(2);
const DRY_RUN_ONLY = args.includes("--dry-run");
const filteredArgs = args.filter((a) => a !== "--dry-run");
const teamArg = filteredArgs[0];
const taskArg = filteredArgs.slice(1).join(" ");

function askConfirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

async function main() {
  if (!teamArg || !taskArg) {
    console.log(`
Usage:
  node team-build.js <team> "<task>"
  node team-build.js --dry-run <team> "<task>"

Teams:
  tech    Original full-stack team
          Pipeline: Frontend Dev → Backend Dev → Database Architect → Test & QA → Code Review → Security

  core    Core annotation product team (the heart of HouseMind)
          Pipeline: UI/UX Designer → Senior Frontend → Backend API → Backend Integrations → Mobile QA

  admin   Admin & Growth team (internal tools + landing page)
          Pipeline: UI/UX Designer → Content & SEO → Fullstack Admin → Frontend Landing

Examples:
  node team-build.js core "Build the annotation workspace — emoji pins, image carousel, product linking"
  node team-build.js admin "Build invite dashboard and landing page"
  node team-build.js tech "Implement annotation system API routes and database schema"
  node team-build.js --dry-run core "Build emoji annotation system"

Outputs:
  departments/<team>/build-report.md        ← latest build report
  departments/<team>/build-runs/<timestamp>/ ← every run archived
`);
    process.exit(0);
  }

  // Phase 1: auto dry-run
  DRY_RUN = true;
  console.log("\n🔍 DRY RUN — estimating prompts and tokens...\n");
  await runBuild(teamArg, taskArg);

  const dryTokens = totalTokens;
  const dryCost = ((dryTokens / 1000) * COST_PER_1K_INPUT).toFixed(4);
  console.log(`\n——— Dry run complete ———`);
  console.log(`Total input tokens: ~${dryTokens}`);
  console.log(`Estimated input cost: ~$${dryCost}`);

  if (DRY_RUN_ONLY) process.exit(0);

  // Confirm before real run
  const go = await askConfirm("\nProceed with real build? [y/N] ");
  if (!go) { console.log("Aborted."); process.exit(0); }

  // Phase 2: real run
  DRY_RUN = false;
  totalTokens = 0;
  console.log("\n🔨 Running build pipeline...\n");
  await runBuild(teamArg, taskArg);
}

main().catch(console.error);