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
// const MODEL = "claude-opus-4-5";
const COST_PER_1K_INPUT = 0.003;
let totalTokens = 0;
let DRY_RUN = false;

// CLI
const args = process.argv.slice(2);
const DRY_RUN_ONLY = args.includes("--dry-run");
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

STACK:
- Frontend: Next.js (React framework) — deployed on Vercel
- Backend: FastAPI (Python) — deployed on Railway
- Database: PostgreSQL
- Storage: S3
- Auth: JWT invite-token system (magic links)

ARCHITECTURE:
- Next.js handles all UI, routing, and frontend logic
- FastAPI handles all API endpoints, business logic, and DB access
- PostgreSQL is the single source of truth
- Frontend calls FastAPI via REST API

CONTEXT FROM LEADERSHIP:
- Architect-first strategy
- Invite-only beta — co-owner personally invites architect beta users
- Mobile-first (Samsung A series, iPhone SE, iPad)
- Thai + English support
- ONE workspace per project

MVP SCOPE (Phase 1, 6-8 weeks):
- Image carousel with reference images
- Emoji annotation system (long-press → 8 emoji types → pin at x,y%)
- Product linking (tap pin → paste URL → scrape images → pick one)
- Product panel filtered by active pins
- Hierarchical projects (main → subprojects)
- Role-based access: Architect, Contractor, Homeowner, Supplier
- Role-colored comments
- Curated reference catalog (~100-150 products in tiles, fixtures, lighting, cladding)

PHASE 1 SKIP:
- Pricing feeds
- Revit integration
- Supplier dashboard
- Automated scraping pipelines

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

PLATFORM CONTEXT:
- Stack: Next.js frontend (Vercel) + FastAPI backend (Railway) + PostgreSQL
- Mobile-first platform (Samsung A series, iPhone SE, iPad)
- Thai + English support
- Invite-only beta — no public signup

STRATEGY:
- Architect-first positioning
- Co-owner personally invites architect beta users
- Position as "the shared workspace for building decisions" — not another marketplace
- The annotation workspace IS the product — marketing leads with this
- Viral loop: architect creates project board, shares with homeowner + contractor

TARGET USERS:
- Architects (power users, decision makers)
- Contractors (mobile, job sites, mid-range Android/older iPhone)
- Homeowners (visual, emotional, non-technical)
- Suppliers (product placement, catalog linking)

MVP FEATURES TO MARKET (Phase 1):
- Pin inspiration directly on images
- Link real products to annotation pins
- Collaborate by role in one shared workspace
- Hierarchical projects (main → subprojects)
- Categories: tiles/flooring, kitchen fixtures/hardware, lighting, exterior cladding

PHASE 1 SKIP (do not market yet):
- Pricing feeds
- Revit integration
- Supplier self-serve dashboard

You are doing independent work for your department. When given a task:
1. Research and think deeply about positioning, messaging, and acquisition
2. Write concrete, actionable recommendations with specific channels, copy, and metrics
3. Include a clear plan with deliverables
4. Flag risks and dependencies on other departments
5. Be direct — kill ideas that don't drive growth
6. Do NOT output full code implementations`,
  },

  operations: {
    name: "Head of Operations",
    system: `You are the Head of Operations for HouseMind — a platform connecting architects, contractors, homeowners, and suppliers to visualize and agree on building products for house projects.

PLATFORM CONTEXT:
- Stack: Next.js frontend (Vercel) + FastAPI backend (Railway) + PostgreSQL
- Mobile-first (Samsung A series, iPhone SE, iPad)
- Thai + English support
- Invite-only beta — co-owner personally manages all invites

OPERATIONAL SCOPE:
- Manually curate ~100-150 reference products (tiles, fixtures, lighting, cladding)
- "Reference" vs "available" labeling
- "Request availability" button for demand-driven supplier recruitment
- Invite token management (admin creates → sends → user accepts)
- User onboarding tracking (architect beta users)
- Onboarding checklist per architect: account created → first board → first share
- Track funnel and drop-off. 15-min feedback calls after first week
- Supplier relationship management
- QA baseline: mid-range Android + iPhone SE devices

PHASE 1 SKIP:
- Supplier self-serve dashboard
- Automated catalog scraping
- Pricing feed management
- Revit integration workflows

CONSTRAINTS:
- Small team, invite-only scale
- Manual processes acceptable for beta
- Flag anything that breaks at 50-100 active users

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

PLATFORM CONTEXT:
- Stack: Next.js frontend (Vercel) + FastAPI backend (Railway) + PostgreSQL
- Mobile-first (Samsung A series, iPhone SE, iPad)
- Thai + English support
- Invite-only beta — co-owner personally invites architects

STRATEGY:
- Architect-first, invite-only beta
- MVP: project boards, emoji annotation system, product linking, role-based commenting, invite-token auth
- 4 categories: tiles/flooring, fixtures/hardware, lighting, cladding
- Annotation IS the core product

SUCCESS CRITERIA:
- 5+ architects create real boards
- 3+ boards shared with homeowner/contractor
- Feedback collected via 15-min calls after first week

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

  if (DRY_RUN) {
    const sysP = systemPrompt.slice(0, 150).replace(/\n/g, " ") + (systemPrompt.length > 150 ? "…" : "");
    const last = messages[messages.length - 1];
    const msgP = String(last.content).slice(0, 200).replace(/\n/g, " ") + (String(last.content).length > 200 ? "…" : "");
    console.log(`  ┌ SYSTEM: ${sysP}`);
    console.log(`  │ ${last.role.toUpperCase()}: ${msgP}`);
    console.log(`  └ ~${tokens} tokens\n`);
    return "[dry-run — skipped]";
  }
  console.log(`  [~${tokens} input tokens]`);

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
  if (dept === "pm" || (dept && task)) {
    /* // Phase 1: auto dry-run
    DRY_RUN = true;
    console.log("\n🔍 DRY RUN — estimating prompts and tokens...\n");
    if (dept === "pm") {
      await runPM();
    } else {
      await runDepartment(dept, task);
    }
    if (DRY_RUN_ONLY) process.exit(0);

    // Confirm before real run
    const go = await askConfirm("\nProceed with real run? [y/N] ");
    if (!go) { console.log("Aborted."); process.exit(0); } */

    // Phase 2: real run
    DRY_RUN = false;
    totalTokens = 0;
    console.log("\n🚀 Running real pipeline...\n");
    if (dept === "pm") {
      await runPM();
    } else {
      await runDepartment(dept, task);
    }
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
}

main().catch(console.error);
