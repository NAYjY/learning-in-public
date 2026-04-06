import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KEY_FILE = path.join(__dirname, "..", "key.txt");
const apiKey = fs.readFileSync(KEY_FILE, "utf-8").trim();
const client = new Anthropic({ apiKey });

const MODEL = "claude-sonnet-4-6";
const COST_PER_1K_INPUT = 0.003;
let totalTokens = 0;

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
// Each team has a head + sub-agents. The head orchestrates the pipeline.
const TEAMS = {
  tech: {
    head: {
      name: "Head of Tech",
      system: `You are the Head of Technology for ${BASE_CONTEXT}

You lead a team of 4 sub-agents: Dev, Test & QA, Code Review, and Security.
Your job is to:
1. Receive a task and break it into sub-tasks for your team
2. Review each sub-agent's output and decide if it passes or needs rework
3. Write the final consolidated department deliverable
4. You control the workflow — you decide what order agents run and what they get

Be decisive. If a sub-agent's output has issues, flag them clearly.
Keep the pipeline moving — don't over-iterate.`,
    },

    agents: {
      frontend: {
        name: "Frontend Dev",
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

    // Pipeline defines the order sub-agents run
    // Each step can reference outputs from previous steps
    pipeline: ["frontend", "backend", "database", "qa", "codereview", "security"],
  },

  marketing: {
    head: {
      name: "Head of Marketing",
      system: `You are the Head of Marketing for ${BASE_CONTEXT}

You lead a team of 6 sub-agents: Brand Strategist, Content Writer, Art & UI, UX Researcher, Growth Lead, and Community Manager.
Your job is to:
1. Receive a task and break it into sub-tasks for your team
2. Review each sub-agent's output and decide if it passes or needs rework
3. Write the final consolidated department deliverable
4. You control the workflow — you decide what order agents run and what they get

Be decisive. Push for clarity in visual direction, user experience, and go-to-market.
Keep the pipeline moving — don't over-iterate.`,
    },

    agents: {
      brand: {
        name: "Brand Strategist",
        system: `You are the Brand Strategist on the Marketing team at ${BASE_CONTEXT}

Your job:
- Define the visual identity: colors, tone, personality of HouseMind
- Position the product: professional tool for architects? Fun visual tool for homeowners? Both? Find the angle
- Define: app icon direction, emoji marker style (custom vs native), loading states, empty states, error states
- Consider bilingual needs: English + Thai. Does the brand voice work in both languages?
- Competitive positioning: how do we stand out from Houzz, Pinterest boards, Figma?
- Flag where the brand is unclear or contradictory
- Deliver: brand guidelines, positioning statement, tone-of-voice document, competitor positioning map`,
      },

      content: {
        name: "Content Writer",
        system: `You are the Content Writer on the Marketing team at ${BASE_CONTEXT}

Your job:
- Write all user-facing copy based on the brand direction
- Microcopy: button labels, tooltips, onboarding prompts, empty states, error messages, confirmation dialogs
- Landing page copy: headline, subhead, feature descriptions, CTAs
- Email sequences: invite email, welcome email, first-project nudge, weekly digest
- In-app onboarding: first-time user flow copy, feature discovery tooltips, annotation tutorial text
- Blog post outlines: launch announcement, "how architects use HouseMind", case study templates
- All copy must work in English AND Thai — flag phrases that don't translate well
- Keep it concise. Architects are busy. Contractors don't read long paragraphs.
- Deliver: microcopy document, email drafts, landing page copy, onboarding script`,
      },

      artui: {
        name: "Art & UI",
        system: `You are the Art & UI Designer on the Marketing team at ${BASE_CONTEXT}

Your job:
- Design UI layouts, visual hierarchy, and interaction patterns based on the brand direction and content
- Specify colors, typography, spacing, component styling in Tailwind CSS terms
- Design the emoji circular menu, annotation markers, carousel UI, modals, product panel
- Think mobile-first: thumb zones, touch targets (min 44x44px), one-hand use
- Design: app icon concepts, loading animations, empty state illustrations, onboarding screens
- Consider the Thai market — Thai font (Prompt) support, reading patterns, cultural color meanings
- Be specific: give exact Tailwind classes, sizes in rem/px, color hex codes
- Flag where custom illustration or icon assets are needed vs what Tailwind/emoji can handle
- You are NOT a coder — describe what it should look like and feel like, not how to code it
- Deliver: wireframe descriptions, component styling specs, icon/emoji sizing, color palette with codes`,
      },

      ux: {
        name: "UX Researcher",
        system: `You are the UX Researcher on the Marketing team at ${BASE_CONTEXT}

Your job:
- Map user journeys and interaction flows for each user type (architect, contractor, homeowner, supplier)
- Identify pain points, confusion risks, and cognitive load issues
- Evaluate the brand direction, content copy, and UI designs — do they actually work for real users?
- Evaluate touch interactions: is long-press discoverable? Do users understand emoji pins? Is the flow intuitive on mobile?
- Research: what do competitors do? What patterns do Figma/Miro/Pinterest use for annotation?
- Test assumptions: will contractors use this on a job site? Bad lighting, dirty hands, gloves?
- Define usability test plans: what to test, with whom, how (remote/in-person)
- Accessibility: color contrast, screen reader support, alternative to gesture-only interactions
- You have final say on whether a design is usable — push back on Art & UI if it looks good but fails in practice
- Deliver: user flow maps, usability concerns, interaction recommendations, test plans, accessibility audit`,
      },

      growth: {
        name: "Growth Lead",
        system: `You are the Growth Lead on the Marketing team at ${BASE_CONTEXT}

Your job:
- Plan user acquisition strategy for invite-only beta and beyond
- Define the viral loop: architect creates project → shares with homeowner + contractor → they invite others
- Analytics: what events to track? Funnel stages? Key metrics (activation, retention, referral)?
- SEO: what pages need to exist? What keywords? Content strategy for organic discovery?
- Paid: is it too early? If not, which channels (Google Ads, Instagram, LINE for Thai market)?
- Referral program: how do we incentivize architects to invite more users?
- Partnerships: architect associations, construction material expos, supplier networks?
- Set specific KPIs for beta: target number of architects, boards created, shares, retention at day 7/30
- Deliver: acquisition plan, funnel definition, analytics event list, KPI targets, referral program spec`,
      },

      community: {
        name: "Community Manager",
        system: `You are the Community Manager on the Marketing team at ${BASE_CONTEXT}

Your job:
- Build and nurture the early user community (architects, contractors, homeowners)
- Plan: onboarding calls, feedback loops, user interviews, feature request collection
- Support: how do users get help? In-app chat? Email? LINE? FAQ page?
- Engagement: weekly tips, featured projects, user spotlights, product recommendations
- Feedback pipeline: collect → categorize → prioritize → report to PM
- Thai market specifics: LINE Official Account? Facebook group? What channels do Thai architects/contractors actually use?
- Handle: beta user complaints, feature requests, bug reports, "how do I..." questions
- Define: community guidelines, response time SLAs, escalation paths
- Early warning system: if users are frustrated or churning, how do we catch it fast?
- Deliver: community plan, support channel setup, feedback process, engagement calendar`,
      },
    },

    pipeline: ["brand", "content", "artui", "ux", "growth", "community"],
  },
};

// ─── Truncate text to stay within token budget ───
function truncate(text, maxChars = 3000) {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n... [truncated — full report in team-report.md] ...";
}

// ─── Rate limit pacer ───
// Free tier: ~15 req/min. Space calls ~12s apart to stay safe.
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
async function chat(systemPrompt, messages, maxTokens = 2000) {
  const tokens = await estimateTokens(systemPrompt, messages);
  totalTokens += tokens;
  console.log(`  [~${tokens} input tokens]`);

  if (DRY_RUN) {
    return "[dry-run — skipped]";
  }

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
        lastCallTime = Date.now(); // reset pacer after long wait
      } else if (err.status === 413 && attempt < 6) {
        // Token limit — truncate messages and retry
        console.log(`  [token limit hit — truncating and retrying...]`);
        messages = messages.map((m) => ({
          ...m,
          content: truncate(m.content, Math.floor(m.content.length * 0.6)),
        }));
      } else {
        throw err;
      }
    }
  }
}

// ─── Read other teams' latest reports for cross-team context ───
function getOtherTeamReports(currentTeamKey) {
  const otherReports = [];
  for (const otherKey of Object.keys(TEAMS)) {
    if (otherKey === currentTeamKey) continue;
    const reportPath = path.join(__dirname, "departments", otherKey, "team-report.md");
    if (fs.existsSync(reportPath)) {
      const content = fs.readFileSync(reportPath, "utf-8");
      otherReports.push({ team: otherKey, name: TEAMS[otherKey].head.name, content });
    }
  }
  return otherReports;
}

function formatCrossTeamContext(otherReports) {
  if (otherReports.length === 0) return "";
  const sections = otherReports
    .map((r) => `--- ${r.name} Report (summary) ---\n${truncate(r.content, 2000)}`)
    .join("\n\n");
  return `\n\nCONTEXT FROM OTHER DEPARTMENTS (read this before starting):\n${sections}\n\n`;
}

// ─── Run a team pipeline ───
async function runTeam(teamKey, task) {
  const team = TEAMS[teamKey];
  if (!team) {
    console.error(`Unknown team: ${teamKey}`);
    console.log("Available teams:", Object.keys(TEAMS).join(", "));
    process.exit(1);
  }

  const teamDir = path.join(__dirname, "departments", teamKey, "team-runs");
  fs.mkdirSync(teamDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = path.join(teamDir, timestamp);
  fs.mkdirSync(runDir, { recursive: true });

  // Load cross-team context
  const otherReports = getOtherTeamReports(teamKey);
  const crossTeamContext = formatCrossTeamContext(otherReports);
  if (otherReports.length > 0) {
    console.log(`\n📋 Loaded reports from: ${otherReports.map((r) => r.name).join(", ")}`);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${team.head.name} — Team Pipeline`);
  console.log(`  Task: ${task}`);
  console.log(`${"=".repeat(60)}\n`);

  // Step 1: Head breaks down the task
  console.log(`[HEAD] Breaking down task for team...\n`);
  const agentList = team.pipeline
    .map((k) => `- ${team.agents[k].name}: what should they do?`)
    .join("\n");
  const breakdown = await chat(team.head.system, [
    {
      role: "user",
      content: `Task for your team: ${task}
${crossTeamContext}
Break this into specific sub-tasks for each of your team members:
${agentList}

Be specific. Give each agent clear instructions. If there are reports from other departments, use their findings to inform your breakdown.`,
    },
  ]);
  console.log(breakdown);
  fs.writeFileSync(path.join(runDir, "0-head-breakdown.md"), breakdown);

  // Step 2: Run pipeline
  const outputs = {};

  for (const agentKey of team.pipeline) {
    const agent = team.agents[agentKey];
    console.log(`\n${"─".repeat(40)}`);
    console.log(`[${agent.name.toUpperCase()}] Working...\n`);

    // Build context from previous agent outputs
    let previousContext = "";
    for (const [prevKey, prevOutput] of Object.entries(outputs)) {
      previousContext += `\n--- ${team.agents[prevKey].name} Output ---\n${truncate(prevOutput, 1500)}\n`;
    }

    const agentPrompt = previousContext
      ? `Task from ${team.head.name}:\n${breakdown}\n\nPrevious team outputs:\n${previousContext}\n\nNow do your part. Focus on your specialization.`
      : `Task from ${team.head.name}:\n${breakdown}\n\nYou are first in the pipeline. Do your part.`;

    const output = await chat(agent.system, [
      { role: "user", content: agentPrompt },
    ]);

    console.log(output);
    outputs[agentKey] = output;
    fs.writeFileSync(path.join(runDir, `${team.pipeline.indexOf(agentKey) + 1}-${agentKey}.md`), output);
  }

  // Step 3: Head consolidates
  console.log(`\n${"─".repeat(40)}`);
  console.log(`[HEAD] Reviewing team outputs and writing final report...\n`);

  let allOutputs = "";
  for (const [agentKey, output] of Object.entries(outputs)) {
    allOutputs += `\n## ${team.agents[agentKey].name} Output:\n${truncate(output, 1000)}\n\n---\n`;
  }

  const finalReport = await chat(team.head.system, [
    { role: "user", content: `Task: ${task}` },
    { role: "assistant", content: breakdown },
    {
      role: "user",
      content: `Your team has completed their work. Here are all outputs:\n${allOutputs}\n\nNow write the final consolidated report:\n1. Summary of what was delivered\n2. What each sub-agent produced (brief)\n3. Issues found and whether they were resolved\n4. Final verdict: is this ready to ship?\n5. Any items deferred to next iteration\n6. **HANDOFF TO OTHER DEPARTMENTS** — Write a specific section for each other team (${Object.keys(TEAMS).filter((k) => k !== teamKey).join(", ")}). What do they need to know from your work? What decisions affect them? What do you need from them? Be specific and actionable.`,
    },
  ]);

  console.log(finalReport);

  // Save final report
  const reportContent = `# ${team.head.name} — Team Run Report

**Date:** ${new Date().toISOString()}
**Task:** ${task}
**Pipeline:** ${team.pipeline.map((k) => team.agents[k].name).join(" → ")}

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

  fs.writeFileSync(path.join(runDir, "final-report.md"), reportContent);

  // Also update latest
  const latestPath = path.join(__dirname, "departments", teamKey, "team-report.md");
  fs.writeFileSync(latestPath, reportContent);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ✓ Team report saved: departments/${teamKey}/team-report.md`);
  console.log(`  ✓ Run artifacts: departments/${teamKey}/team-runs/${timestamp}/`);
  console.log(`${"=".repeat(60)}`);
  printTokenSummary();
}

// ─── Scrum: cross-team agent pairing ───
// Quick focused exchanges between agents from different teams
const SCRUM_PAIRS = [
  {
    label: "UX ↔ Frontend",
    a: { team: "marketing", agent: "ux", name: "UX Researcher" },
    b: { team: "tech", agent: "frontend", name: "Frontend Dev" },
    topic: "interaction patterns, touch UX feasibility, component behavior",
  },
  {
    label: "Art & UI ↔ Frontend",
    a: { team: "marketing", agent: "artui", name: "Art & UI" },
    b: { team: "tech", agent: "frontend", name: "Frontend Dev" },
    topic: "visual specs, Tailwind implementation, responsive layout",
  },
  {
    label: "UX ↔ Database",
    a: { team: "marketing", agent: "ux", name: "UX Researcher" },
    b: { team: "tech", agent: "database", name: "Database Architect" },
    topic: "data model limits on UX flows, what queries are needed for the UI",
  },
  {
    label: "Content ↔ Backend",
    a: { team: "marketing", agent: "content", name: "Content Writer" },
    b: { team: "tech", agent: "backend", name: "Backend Dev" },
    topic: "API error messages, validation messages, response copy for empty/error states",
  },
  {
    label: "Growth ↔ Backend",
    a: { team: "marketing", agent: "growth", name: "Growth Lead" },
    b: { team: "tech", agent: "backend", name: "Backend Dev" },
    topic: "analytics events, tracking endpoints, funnel data collection",
  },
  {
    label: "Community ↔ UX",
    a: { team: "marketing", agent: "community", name: "Community Manager" },
    b: { team: "marketing", agent: "ux", name: "UX Researcher" },
    topic: "user feedback patterns, common complaints, feature request priorities",
  },
];

async function runScrum(task) {
  const scrumDir = path.join(__dirname, "departments", "scrum-logs");
  fs.mkdirSync(scrumDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logFile = path.join(scrumDir, `scrum-${timestamp}.md`);

  let log = `# Scrum Meeting\n\n**Date:** ${new Date().toISOString()}\n**Topic:** ${task}\n\n---\n\n`;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  🔄 SCRUM — Cross-Team Standup`);
  console.log(`  Topic: ${task}`);
  console.log(`${"=".repeat(60)}`);

  // Load both team reports for context
  const allReports = getOtherTeamReports("__none__"); // gets all teams

  const reportContext = allReports.length > 0
    ? allReports.map((r) => `--- ${r.name} Report ---\n${r.content}`).join("\n\n")
    : "No team reports available yet.";

  for (const pair of SCRUM_PAIRS) {
    const agentA = TEAMS[pair.a.team]?.agents[pair.a.agent];
    const agentB = TEAMS[pair.b.team]?.agents[pair.b.agent];
    if (!agentA || !agentB) continue;

    console.log(`\n${"─".repeat(50)}`);
    console.log(`  ${pair.label} — ${pair.topic}`);
    console.log(`${"─".repeat(50)}`);
    log += `## ${pair.label}\n**Focus:** ${pair.topic}\n\n`;

    // Round 1: Agent A speaks first
    console.log(`\n[${pair.a.name}] →`);
    const msgA = await chat(agentA.system, [
      {
        role: "user",
        content: `SCRUM STANDUP — You are in a quick cross-team sync with ${pair.b.name} from the ${pair.b.team} team.
Topic: ${task}
Focus area: ${pair.topic}

Context from team reports:\n${reportContext}

Share your key concerns, questions, or requirements for ${pair.b.name}. What do you need from them? What might not work? Keep it focused — 3-5 points max.`,
      },
    ]);
    console.log(msgA);
    log += `### ${pair.a.name}\n${msgA}\n\n`;

    // Round 2: Agent B responds
    console.log(`\n[${pair.b.name}] →`);
    const msgB = await chat(agentB.system, [
      {
        role: "user",
        content: `SCRUM STANDUP — You are in a quick cross-team sync with ${pair.a.name} from the ${pair.a.team} team.
Topic: ${task}
Focus area: ${pair.topic}

Context from team reports:\n${reportContext}

${pair.a.name} said:\n${msgA}

Respond directly. Answer their questions, push back where needed, flag blockers. What can you commit to? What needs more discussion? Keep it focused.`,
      },
    ]);
    console.log(msgB);
    log += `### ${pair.b.name}\n${msgB}\n\n`;

    // Round 3: Agent A final response
    console.log(`\n[${pair.a.name}] (follow-up) →`);
    const msgA2 = await chat(agentA.system, [
      {
        role: "user",
        content: `SCRUM FOLLOW-UP with ${pair.b.name}.

You said:\n${msgA}

${pair.b.name} responded:\n${msgB}

Any final concerns, agreements, or action items? Keep it brief — 2-3 sentences. End with what is AGREED and what is UNRESOLVED.`,
      },
    ]);
    console.log(msgA2);
    log += `### ${pair.a.name} (follow-up)\n${msgA2}\n\n---\n\n`;
  }

  fs.writeFileSync(logFile, log);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ✓ Scrum log saved: departments/scrum-logs/scrum-${timestamp}.md`);
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
const DRY_RUN = args.includes("--dry-run");
const filteredArgs = args.filter((a) => a !== "--dry-run");
const teamArg = filteredArgs[0];
const taskArg = filteredArgs.slice(1).join(" ");

if (teamArg === "scrum" && taskArg) {
  if (DRY_RUN) console.log("\n🔍 DRY RUN — estimating tokens without API calls\n");
  runScrum(taskArg).catch(console.error);
} else if (teamArg && taskArg) {
  if (DRY_RUN) console.log("\n🔍 DRY RUN — estimating tokens without API calls\n");
  runTeam(teamArg, taskArg).catch(console.error);
} else {
  console.log(`
Usage:
  node team.js <team> <task>    Run a team pipeline
  node team.js scrum <topic>    Cross-team standup (UX↔Frontend, Art↔Frontend, UX↔DB, Brand↔Backend)

Teams: ${Object.keys(TEAMS).join(", ")}

Each team has a Head who orchestrates sub-agents in a pipeline.
Teams auto-read other departments' latest reports as context.
Heads include a "Handoff to other departments" section in final reports.

Tech team pipeline:
  Head of Tech → Frontend Dev → Backend Dev → Database Architect → Test & QA → Code Review → Security → Head (final report)

Marketing team pipeline:
  Head of Marketing → Brand Strategist → Content Writer → Art & UI → UX Researcher → Growth Lead → Community Manager → Head (final report)

Scrum pairs:
  UX Researcher ↔ Frontend Dev    (interaction patterns, touch feasibility)
  Art & UI ↔ Frontend Dev         (visual specs, Tailwind, responsive)
  UX Researcher ↔ Database        (data model vs UX flow limits)
  Content Writer ↔ Backend Dev    (error messages, validation copy, empty states)
  Growth Lead ↔ Backend Dev       (analytics events, tracking, funnel data)
  Community Manager ↔ UX          (user feedback, complaints, feature priorities)

Examples:
  node team.js tech "Build the full annotation system"
  node team.js tech --dry-run "Build the full annotation system"   (estimate tokens only)
  node team.js marketing "Design the annotation workspace — brand direction, UI design, UX validation, mobile-first"
  node team.js scrum "Align on the annotation system — does the UI design match what frontend can build?"
`);
}
