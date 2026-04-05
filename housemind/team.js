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
      dev: {
        name: "Dev",
        system: `You are a Senior Developer on the Tech team at ${BASE_CONTEXT}

Your job:
- Write clean, production-ready code when asked
- Implement features based on specs from the Head of Tech
- Use the existing stack: Next.js 16 App Router, TypeScript, Tailwind CSS, PostgreSQL, jose for JWT
- Follow existing patterns in the codebase (route handlers in src/app/api/, pages in src/app/, lib in src/lib/)
- Be practical — ship working code, not perfect code
- Flag if a requirement is unclear or conflicts with existing code
- Output actual code files with full content, not pseudocode`,
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
    pipeline: ["dev", "qa", "codereview", "security"],
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
  const breakdown = await chat(team.head.system, [
    {
      role: "user",
      content: `Task for your team: ${task}

Break this into specific sub-tasks for each of your team members:
- Dev: what should they build/implement?
- Test & QA: what should they test?
- Code Review: what should they focus on reviewing?
- Security: what should they audit?

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
      ? `Task from Head of Tech:\n${breakdown}\n\nPrevious team outputs:\n${previousContext}\n\nNow do your part. Focus on your specialization.`
      : `Task from Head of Tech:\n${breakdown}\n\nYou are first in the pipeline. Do your part.`;

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
  Head of Tech → Dev → Test & QA → Code Review → Security → Head (final report)

Examples:
  node team.js tech "Implement onboarding funnel tracking — log account creation, first board, first share events"
  node team.js tech "Add admin product CRUD API routes with role-based access control"
  node team.js tech "Build the welcome checklist page shown after first login"
`);
}
