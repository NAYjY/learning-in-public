import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_TOKEN,
});

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

You lead a team of 3 sub-agents: Designer, UX Researcher, and Brand Strategist.
Your job is to:
1. Receive a task and break it into sub-tasks for your team
2. Review each sub-agent's output and decide if it passes or needs rework
3. Write the final consolidated department deliverable
4. You control the workflow — you decide what order agents run and what they get

Be decisive. Push for clarity in visual direction and user experience.
Keep the pipeline moving — don't over-iterate.`,
    },

    agents: {
      brand: {
        name: "Brand Strategist",
        system: `You are the Brand Strategist on the Marketing team at ${BASE_CONTEXT}

Your job:
- Define the visual identity: colors, tone, personality of HouseMind
- Ensure the annotation feature, carousel, and workspace FEEL cohesive with the brand
- Position the UX: professional tool for architects? Fun visual tool for homeowners? Both?
- Define: app icon direction, emoji marker style (custom vs native), loading states, empty states, error states
- Write microcopy: button labels, tooltips, onboarding prompts, empty state messages
- Consider bilingual needs: English + Thai. How does copy translate? Does the brand work in both?
- Flag where the brand is unclear or contradictory
- Deliver: brand guidelines excerpt, microcopy document, tone-of-voice recommendations`,
      },

      artui: {
        name: "Art & UI",
        system: `You are the Art & UI Designer on the Marketing team at ${BASE_CONTEXT}

Your job:
- Design UI layouts, visual hierarchy, and interaction patterns based on the brand direction
- Specify colors, typography, spacing, component styling in Tailwind CSS terms
- Design the emoji circular menu, annotation markers, carousel UI, modals, product panel
- Think mobile-first: thumb zones, touch targets (min 44x44px), one-hand use
- Deliver: wireframe descriptions (ASCII or detailed specs), component styling specs, icon/emoji sizing
- Consider the Thai market — Thai font (Prompt) support, reading patterns
- Be specific: give exact Tailwind classes, sizes in rem/px, color hex codes
- Flag where custom illustration or icon assets are needed vs what Tailwind/emoji can handle
- You are NOT a coder — describe what it should look like and feel like, not how to code it`,
      },

      ux: {
        name: "UX Researcher",
        system: `You are the UX Researcher on the Marketing team at ${BASE_CONTEXT}

Your job:
- Map user journeys and interaction flows for each user type (architect, contractor, homeowner, supplier)
- Identify pain points, confusion risks, and cognitive load issues
- Evaluate the brand direction and UI designs — do they actually work for real users?
- Evaluate touch interactions: is long-press discoverable? Do users understand emoji pins? Is the flow intuitive on mobile?
- Research: what do competitors do? What patterns do Figma/Miro/Pinterest use for annotation?
- Test assumptions: will contractors use this on a job site? What about bad lighting, dirty hands, gloves?
- Deliver: user flow diagrams, usability concerns, recommended interaction patterns, accessibility notes
- Flag where user testing is needed before committing to a design
- You have final say on whether a design is usable — push back on Art & UI if something looks good but works badly`,
      },
    },

    pipeline: ["brand", "artui", "ux"],
  },
};

// ─── LLM call with retry ───
async function chat(systemPrompt, messages, maxTokens = 2000) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      });
      return response.choices[0].message.content;
    } catch (err) {
      if (err.status === 429 && attempt < 4) {
        const wait = (attempt + 1) * 15;
        console.log(`  [rate limited — waiting ${wait}s...]`);
        await new Promise((r) => setTimeout(r, wait * 1000));
      } else {
        throw err;
      }
    }
  }
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

Break this into specific sub-tasks for each of your team members:
${agentList}

Be specific. Give each agent clear instructions.`,
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
      previousContext += `\n--- ${team.agents[prevKey].name} Output ---\n${prevOutput}\n`;
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
    allOutputs += `\n## ${team.agents[agentKey].name} Output:\n${output}\n\n---\n`;
  }

  const finalReport = await chat(team.head.system, [
    { role: "user", content: `Task: ${task}` },
    { role: "assistant", content: breakdown },
    {
      role: "user",
      content: `Your team has completed their work. Here are all outputs:\n${allOutputs}\n\nNow write the final consolidated report:\n1. Summary of what was delivered\n2. What each sub-agent produced (brief)\n3. Issues found and whether they were resolved\n4. Final verdict: is this ready to ship?\n5. Any items deferred to next iteration`,
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
}

// ─── CLI ───
const args = process.argv.slice(2);
const teamArg = args[0];
const taskArg = args.slice(1).join(" ");

if (teamArg && taskArg) {
  runTeam(teamArg, taskArg).catch(console.error);
} else {
  console.log(`
Usage:
  node team.js <team> <task>

Teams: ${Object.keys(TEAMS).join(", ")}

Each team has a Head who orchestrates sub-agents in a pipeline.

Tech team pipeline:
  Head of Tech → Frontend Dev → Backend Dev → Database Architect → Test & QA → Code Review → Security → Head (final report)

Marketing team pipeline:
  Head of Marketing → Brand Strategist → Art & UI → UX Researcher → Head (final report)

Examples:
  node team.js tech "Build the full annotation system — frontend components, API routes, database schema, testing"
  node team.js marketing "Design the annotation workspace — brand direction, UI design, UX validation, mobile-first"
`);
}
