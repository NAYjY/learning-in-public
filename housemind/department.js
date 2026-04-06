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

// CLI
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const filteredArgs = args.filter((a) => a !== "--dry-run");
const dept = filteredArgs[0];
const task = filteredArgs.slice(1).join(" ");

async function estimateTokens(systemPrompt, messages) {
  const response = await client.messages.countTokens({
    model: MODEL,
    system: systemPrompt,
    messages: messages,
  });
  return response.input_tokens;
}

const DEPARTMENTS = {
  tech: {
    name: "Head of Tech",
    system: `You are the Head of Technology for HouseMind — a platform connecting architects, contractors, homeowners, and suppliers to visualize and agree on building products for house projects.

Context from leadership meeting:
- Architect-first strategy. Invite-only beta — co-owner personally invites architect beta users.
- MVP: Next.js app, Postgres, S3. Project boards with sharing, role-based commenting, product catalog.
- Curated reference catalog (~100-150 products in tiles, fixtures, lighting, cladding).
- Invite-token auth (magic links). Inline feedback widget.
- Phase 1 skip: pricing feeds, Revit integration, supplier dashboard, scraping.

You are doing independent work for your department. When given a task:
1. Research and think deeply about the technical approach
2. Write concrete, actionable recommendations with specific technologies, architecture decisions, and tradeoffs
3. Include a clear plan with deliverables
4. Flag risks and dependencies on other departments
5. Be honest about complexity — don't over-engineer, don't under-estimate`,
  },

  marketing: {
    name: "Head of Marketing",
    system: `You are the Head of Marketing for HouseMind — a platform connecting architects, contractors, homeowners, and suppliers to visualize and agree on building products for house projects.

Context from leadership meeting:
- Architect-first strategy. Invite-only beta — co-owner personally invites architect beta users.
- Position as "the shared workspace for building decisions" — not another marketplace.
- Categories: tiles/flooring, kitchen fixtures/hardware, lighting, exterior cladding.
- Growth engine: architect creates project board, shares with homeowner + contractor = viral loop.
- No public launch yet. Beta with personal invites.

You are doing independent work for your department. When given a task:
1. Research and think deeply about positioning, messaging, and acquisition
2. Write concrete, actionable recommendations with specific channels, copy, and metrics
3. Include a clear plan with deliverables
4. Flag risks and dependencies on other departments
5. Be direct — kill ideas that don't drive growth`,
  },

  operations: {
    name: "Head of Operations",
    system: `You are the Head of Operations for HouseMind — a platform connecting architects, contractors, homeowners, and suppliers to visualize and agree on building products for house projects.

Context from leadership meeting:
- Architect-first strategy. Invite-only beta — co-owner personally invites architect beta users.
- Manually curate ~100-150 reference products in tiles, fixtures, lighting, cladding.
- "Reference" vs "available" labeling. "Request availability" button for demand-driven supplier recruitment.
- Onboarding checklist per architect: account created → first board → first share.
- Track funnel and drop-off. 15-min feedback calls after first week.

You are doing independent work for your department. When given a task:
1. Research and think deeply about workflows, processes, and what works on the ground
2. Write concrete, actionable recommendations with specific steps and ownership
3. Include a clear plan with deliverables
4. Flag risks and dependencies on other departments
5. Be pragmatic — flag what's not executable`,
  },

  pm: {
    name: "PM",
    system: `You are the Product Manager for HouseMind — a platform connecting architects, contractors, homeowners, and suppliers to visualize and agree on building products for house projects.

Context from leadership meeting:
- Architect-first, invite-only beta. Co-owner invites architects personally as beta users.
- MVP: project boards, product catalog, role-based commenting, invite-token auth.
- 4 categories: tiles/flooring, fixtures/hardware, lighting, cladding.
- Success criteria: 5+ architects create real boards, 3+ boards shared with homeowner/contractor.

Your job is to:
1. Review reports from Tech, Marketing, and Operations departments
2. Identify conflicts, gaps, and dependencies between departments
3. Synthesize into a unified action plan with clear priorities and timeline
4. Flag decisions that only the founder can make
5. Be brief, structured, and decisive`,
  },
};

async function chat(systemPrompt, messages) {
  const tokens = await estimateTokens(systemPrompt, messages);
  totalTokens += tokens;
  console.log(`  [~${tokens} input tokens]`);

  if (DRY_RUN) {
    return "[dry-run — skipped]";
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: systemPrompt,
        messages: messages,
      });
      return response.content[0].text;
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

async function runDepartment(deptKey, task) {
  const dept = DEPARTMENTS[deptKey];
  if (!dept) {
    console.error(`Unknown department: ${deptKey}`);
    console.log("Available:", Object.keys(DEPARTMENTS).join(", "));
    process.exit(1);
  }

  const deptDir = path.join(__dirname, "departments", deptKey);
  fs.mkdirSync(deptDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  console.log(`\n=== ${dept.name} — Department Work ===`);
  console.log(`Task: ${task}\n`);

  // Phase 1: Research & think
  console.log("[Phase 1] Researching...");
  const research = await chat(dept.system, [
    { role: "user", content: `Task: ${task}\n\nFirst, break this task down. What do you need to research and figure out? List the key questions and areas to investigate. Be thorough.` },
  ]);
  console.log(research);

  // Phase 2: Deep work
  console.log("\n[Phase 2] Doing deep work...");
  const deepWork = await chat(dept.system, [
    { role: "user", content: `Task: ${task}` },
    { role: "assistant", content: research },
    { role: "user", content: `Good. Now do the actual work. For each area you identified, provide concrete recommendations, specific decisions, and actionable deliverables. Be detailed and practical.` },
  ]);
  console.log(deepWork);

  // Phase 3: Final report
  console.log("\n[Phase 3] Writing final report...");
  const report = await chat(dept.system, [
    { role: "user", content: `Task: ${task}` },
    { role: "assistant", content: research },
    { role: "user", content: `Do the actual work.` },
    { role: "assistant", content: deepWork },
    { role: "user", content: `Now write your final department report in clean markdown. Include:\n- Executive summary (3 sentences)\n- Key decisions made\n- Deliverables with owners and dependencies\n- Risks and open questions for PM\n- What you need from other departments` },
  ]);

  // Save report
  const reportFile = path.join(deptDir, `report-${timestamp}.md`);
  const reportContent = `# ${dept.name} — Department Report\n\n**Date:** ${new Date().toISOString()}\n**Task:** ${task}\n\n---\n\n${report}`;
  fs.writeFileSync(reportFile, reportContent);

  // Also update the latest report
  fs.writeFileSync(path.join(deptDir, "report.md"), reportContent);

  console.log(`\n✓ Report saved: departments/${deptKey}/report.md`);
  printTokenSummary();
  return reportFile;
}

async function runPM() {
  const pm = DEPARTMENTS.pm;
  console.log(`\n=== PM — Synthesizing Department Reports ===\n`);

  // Read all department reports
  const deptReports = {};
  for (const dept of ["tech", "marketing", "operations"]) {
    const reportPath = path.join(__dirname, "departments", dept, "report.md");
    if (fs.existsSync(reportPath)) {
      deptReports[dept] = fs.readFileSync(reportPath, "utf-8");
    }
  }

  if (Object.keys(deptReports).length === 0) {
    console.log("No department reports found. Run departments first.");
    process.exit(1);
  }

  const combined = Object.entries(deptReports)
    .map(([dept, content]) => `## ${dept.toUpperCase()} REPORT:\n${content}`)
    .join("\n\n---\n\n");

  const synthesis = await chat(pm.system, [
    { role: "user", content: `Here are the department reports:\n\n${combined}\n\nReview these reports. Identify conflicts, gaps, and dependencies. Synthesize into a unified action plan with clear priorities, timeline, and ownership. Flag any decisions that need the founder.` },
  ]);

  console.log(synthesis);

  const pmDir = path.join(__dirname, "departments", "pm");
  fs.mkdirSync(pmDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportContent = `# PM — Synthesis Report\n\n**Date:** ${new Date().toISOString()}\n\n---\n\n${synthesis}`;
  fs.writeFileSync(path.join(pmDir, `report-${timestamp}.md`), reportContent);
  fs.writeFileSync(path.join(pmDir, "report.md"), reportContent);

  console.log(`\n✓ PM report saved: departments/pm/report.md`);
  printTokenSummary();
}

function printTokenSummary() {
  const cost = ((totalTokens / 1000) * COST_PER_1K_INPUT).toFixed(4);
  console.log(`\nTotal input tokens: ~${totalTokens}`);
  console.log(`Estimated input cost: ~$${cost}`);
}

// CLI
if (DRY_RUN) {
  console.log("\n🔍 DRY RUN — estimating tokens without API calls\n");
}

if (dept === "pm") {
  runPM().catch(console.error);
} else if (dept && task) {
  runDepartment(dept, task).catch(console.error);
} else {
  console.log(`
Usage:
  node department.js <dept> <task>    Run a department with a task
  node department.js pm               PM synthesizes all department reports

Departments: tech, marketing, operations, pm

Examples:
  node department.js tech "Design the MVP architecture for project boards with invite-only auth"
  node department.js tech --dry-run "Design the MVP architecture"   (estimate tokens only)
  node department.js marketing "Plan the invite-only beta launch messaging for architects"
  node department.js operations "Build the product catalog curation plan for 100-150 items"
  node department.js pm
`);
}
