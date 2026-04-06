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

// Higher token limits for code-producing agents
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

// ─── Team definitions (BUILD mode — agents produce actual code) ───
const TEAMS = {
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
          content: truncate(m.content, Math.floor(m.content.length * 0.6)),
        }));
      } else {
        throw err;
      }
    }
  }
}

// ─── Read team meeting reports for context ───
function getTeamReport(teamKey) {
  const reportPath = path.join(__dirname, "departments", teamKey, "team-report.md");
  if (fs.existsSync(reportPath)) {
    return fs.readFileSync(reportPath, "utf-8");
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

  // Load the team's meeting report for context
  const meetingReport = getTeamReport(teamKey);
  const meetingContext = meetingReport
    ? `\n\nCONTEXT FROM TEAM MEETING (use this to inform your implementation):\n${truncate(meetingReport, 4000)}\n\n`
    : "";

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  🔨 ${team.head.name} — BUILD Pipeline`);
  console.log(`  Task: ${task}`);
  console.log(`${"=".repeat(60)}\n`);

  if (meetingReport) {
    console.log(`📋 Loaded meeting report for context\n`);
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

Be specific. Give each agent clear instructions on what code/artifacts to produce. Reference the meeting report if available.`,
    },
  ]);
  console.log(breakdown);
  fs.writeFileSync(path.join(runDir, "0-head-breakdown.md"), breakdown);

  // Step 2: Run pipeline
  const outputs = {};

  for (const agentKey of team.pipeline) {
    const agent = team.agents[agentKey];
    const agentMaxTokens = agent.maxTokens || DEFAULT_MAX_TOKENS;
    console.log(`\n${"─".repeat(40)}`);
    console.log(`[${agent.name.toUpperCase()}] Building... (max ${agentMaxTokens} tokens)\n`);

    // Build context from previous agent outputs (higher truncation for build mode)
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
    fs.writeFileSync(path.join(runDir, `${team.pipeline.indexOf(agentKey) + 1}-${agentKey}.md`), output);
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
      content: `Your team has completed their build work. Here are all outputs:\n${allOutputs}\n\nNow write the final build report:\n1. Summary of what was built\n2. Files created/modified by each agent\n3. Issues found by Code Review and Security — are they blocking?\n4. Final verdict: is this ready to merge?\n5. Any items that need follow-up`,
    },
  ]);

  console.log(finalReport);

  // Save build report
  const reportContent = `# ${team.head.name} — Build Report

**Date:** ${new Date().toISOString()}
**Task:** ${task}
**Pipeline:** ${team.pipeline.map((k) => team.agents[k].name).join(" → ")}
**Mode:** BUILD (code implementation)

---

## Head Breakdown
${breakdown}

---

## Build Outputs

${Object.entries(outputs)
  .map(([k, v]) => `### ${team.agents[k].name}\n${v}`)
  .join("\n\n---\n\n")}

---

## Final Report
${finalReport}
`;

  fs.writeFileSync(path.join(runDir, "build-report.md"), reportContent);

  // Also update latest build report
  const latestPath = path.join(__dirname, "departments", teamKey, "build-report.md");
  fs.writeFileSync(latestPath, reportContent);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ✓ Build report saved: departments/${teamKey}/build-report.md`);
  console.log(`  ✓ Build artifacts: departments/${teamKey}/build-runs/${timestamp}/`);
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
  if (teamArg && taskArg) {
    // Phase 1: auto dry-run
    DRY_RUN = true;
    console.log("\n🔍 DRY RUN — estimating prompts and tokens...\n");
    await runBuild(teamArg, taskArg);
    if (DRY_RUN_ONLY) process.exit(0);

    // Confirm before real run
    const go = await askConfirm("\nProceed with real build? [y/N] ");
    if (!go) { console.log("Aborted."); process.exit(0); }

    // Phase 2: real run
    DRY_RUN = false;
    totalTokens = 0;
    console.log("\n🔨 Running build pipeline...\n");
    await runBuild(teamArg, taskArg);
  } else {
    console.log(`
Usage:
  node team-build.js <team> <task>              Run a build pipeline (produces actual code)
  node team-build.js --dry-run <team> <task>    Estimate tokens only

Teams: ${Object.keys(TEAMS).join(", ")}

This is the BUILD tool — agents produce actual code implementations.
For planning/meeting reports, use team.js instead.

Tech build pipeline:
  Head of Tech → Frontend Dev → Backend Dev → Database Architect → Test & QA → Code Review → Security → Head (build report)

Build mode differences from team.js (meeting mode):
  - Agents output actual code, SQL, and test implementations
  - Higher token limits per agent (4096 for code agents)
  - Higher truncation limits for pipeline context
  - Reads team meeting report (team-report.md) as context
  - Saves to build-runs/ and build-report.md (separate from meeting reports)

Examples:
  node team-build.js tech "Implement the annotation system API routes and database schema"
  node team-build.js tech --dry-run "Build the image upload endpoint with thumbnail generation"
`);
  }
}

main().catch(console.error);
