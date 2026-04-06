// consolidate.js — Run only the Head consolidation step using already-saved agent outputs.
// Usage: node consolidate.js <team> <run-dir>
// Example: node consolidate.js marketing departments/marketing/team-runs/2026-04-06T01-29-54-273Z

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KEY_FILE = path.join(__dirname, "..", "key.txt");
const apiKey = fs.readFileSync(KEY_FILE, "utf-8").trim();
const client = new Anthropic({ apiKey });

const MODEL = "claude-sonnet-4-5";
const COST_PER_1K_INPUT = 0.003;

function truncate(text, maxChars = 1000) {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n...[truncated]...";
}

// ─── Team definitions (head system + agent names) ───
const TEAMS = {
  marketing: {
    headName: "Head of Marketing",
    headSystem: `You are the Head of Marketing for HouseMind — a platform connecting architects, contractors, homeowners, and suppliers to visualize and agree on building products for house projects.

Context: Architect-first, invite-only beta. Merge Flask annotation prototype into Next.js decided. Phase 1 MVP focus.

Your job as Head: orchestrate your team, review outputs, write the final consolidated report.`,
    agentFiles: ["1-brand.md", "2-content.md", "3-artui.md", "4-ux.md", "5-growth.md", "6-community.md"],
    agentNames: ["Brand Strategist", "Content Writer", "Art & UI Designer", "UX Researcher", "Growth Lead", "Community Manager"],
    otherTeams: ["tech"],
  },
  tech: {
    headName: "Head of Tech",
    headSystem: `You are the Head of Technology for HouseMind — a platform connecting architects, contractors, homeowners, and suppliers to visualize and agree on building products for house projects.

Context: Architect-first, invite-only beta. Next.js 16 + TS + Tailwind + PostgreSQL + JWT auth. Merging Flask annotation system in.

Your job as Head: orchestrate your team, review outputs, write the final consolidated report.`,
    agentFiles: ["1-frontend.md", "2-backend.md", "3-database.md", "4-qa.md", "5-codereview.md", "6-security.md"],
    agentNames: ["Frontend Dev", "Backend Dev", "Database Architect", "Test & QA", "Code Review", "Security"],
    otherTeams: ["marketing"],
  },
};

async function consolidate(teamKey, runDir) {
  const team = TEAMS[teamKey];
  if (!team) {
    console.error(`Unknown team: ${teamKey}`);
    console.log("Available:", Object.keys(TEAMS).join(", "));
    process.exit(1);
  }

  const absRunDir = path.resolve(runDir);
  if (!fs.existsSync(absRunDir)) {
    console.error(`Run directory not found: ${absRunDir}`);
    process.exit(1);
  }

  // Read breakdown
  const breakdownPath = path.join(absRunDir, "0-head-breakdown.md");
  if (!fs.existsSync(breakdownPath)) {
    console.error(`Missing 0-head-breakdown.md in ${absRunDir}`);
    process.exit(1);
  }
  const breakdown = fs.readFileSync(breakdownPath, "utf-8");

  // Read agent outputs
  let allOutputs = "";
  let missing = [];
  for (let i = 0; i < team.agentFiles.length; i++) {
    const filePath = path.join(absRunDir, team.agentFiles[i]);
    if (!fs.existsSync(filePath)) {
      missing.push(team.agentFiles[i]);
      continue;
    }
    const text = fs.readFileSync(filePath, "utf-8");
    allOutputs += `\n## ${team.agentNames[i]} Output:\n${truncate(text, 1000)}\n\n---\n`;
  }

  if (missing.length > 0) {
    console.warn(`⚠️  Missing agent files: ${missing.join(", ")}`);
  }

  // Infer task from breakdown first line
  const task = breakdown.split("\n").find((l) => l.trim().length > 20) || "Team task";

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${team.headName} — Consolidation`);
  console.log(`  Run dir: ${runDir}`);
  console.log(`${"=".repeat(60)}\n`);

  // Token estimate
  const messages = [
    { role: "user", content: `Task: ${task}` },
    { role: "assistant", content: truncate(breakdown, 1500) },
    {
      role: "user",
      content: `Your team has completed their work. Here are all outputs:\n${allOutputs}\n\nNow write the final consolidated report:\n1. Summary of what was delivered\n2. What each sub-agent produced (brief)\n3. Issues found and whether they were resolved\n4. Final verdict: is this ready to ship?\n5. Any items deferred to next iteration\n6. **HANDOFF TO OTHER DEPARTMENTS** — Write a specific section for each other team (${team.otherTeams.join(", ")}). What do they need to know? What decisions affect them? What do you need from them?`,
    },
  ];

  const tokenResp = await client.messages.countTokens({
    model: MODEL,
    system: team.headSystem,
    messages,
  });
  const tokens = tokenResp.input_tokens;
  const cost = ((tokens / 1000) * COST_PER_1K_INPUT).toFixed(4);
  console.log(`Input tokens: ~${tokens}  (~$${cost})\n`);

  // Call
  console.log("[HEAD] Writing final consolidated report...\n");
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    system: team.headSystem,
    messages,
  });
  const finalReport = response.content[0].text;
  console.log(finalReport);

  // Save
  const reportContent = `# ${team.headName} — Team Run Report

**Date:** ${new Date().toISOString()}
**Run dir:** ${runDir}

---

## Head Breakdown
${breakdown}

---

## Final Report
${finalReport}
`;

  const finalPath = path.join(absRunDir, "final-report.md");
  fs.writeFileSync(finalPath, reportContent);

  const teamReportPath = path.join(__dirname, "departments", teamKey, "team-report.md");
  fs.writeFileSync(teamReportPath, reportContent);

  const outputTokens = response.usage?.output_tokens ?? 0;
  const totalCost = (((tokens + outputTokens) / 1000) * COST_PER_1K_INPUT).toFixed(4);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`✓ Saved: ${path.relative(process.cwd(), finalPath)}`);
  console.log(`✓ Saved: departments/${teamKey}/team-report.md`);
  console.log(`Total tokens: ~${tokens + outputTokens}  (~$${totalCost})`);
  console.log(`${"=".repeat(60)}\n`);
}

// CLI
const [, , teamArg, runDirArg] = process.argv;
if (!teamArg || !runDirArg) {
  console.log(`
Usage:
  node consolidate.js <team> <run-dir>

Examples:
  node consolidate.js marketing departments/marketing/team-runs/2026-04-06T01-29-54-273Z
  node consolidate.js tech departments/tech/team-runs/2026-04-06T01-00-00-000Z
`);
  process.exit(1);
}

consolidate(teamArg, runDirArg).catch(console.error);
