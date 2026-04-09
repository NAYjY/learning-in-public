import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { fileURLToPath } from "url";
import { DEPARTMENTS } from "./agents.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KEY_FILE = path.join(__dirname, "..", "key.txt");
const apiKey = fs.readFileSync(KEY_FILE, "utf-8").trim();
const client = new Anthropic({ apiKey });

const MODEL = "claude-sonnet-4-5";
// const MODEL = "claude-opus-4-5";
const COST_PER_1K_INPUT = 0.003;
const COST_PER_1K_OUTPUT = 0.015;

// ─── TOKEN BUDGET ─────────────────────────────────────────────────────────────
const MAX_TOKENS_PER_RUN = 12000;

const PHASE_TOKEN_LIMITS = {
  research: 1500,
  deepWork: 3000,
  report: 1000,
};

const TOKEN_WARNING_THRESHOLD = 0.8; // 80%

// Per-department tracking (input + output)
const deptTokens = {}; // { deptKey: { input: 0, output: 0 } }

let totalInputTokens = 0;
let totalOutputTokens = 0;
let earlyStop = false;

// ─── MEETING RULES ────────────────────────────────────────────────────────────
const MEETING_RULES = {
  timeboxes: {
    research: "Max 10 minutes of thinking. Be focused, not exhaustive.",
    deepWork: "Max 20 minutes of work. Prioritize depth on the top 3 issues.",
    report: "Max 5 minutes. Be concise — no padding, no repetition.",
  },
  formatRules: [
    "Use headers and bullet points. No walls of text.",
    "Lead with the most important point. Don't bury the lede.",
    "If something is uncertain, say so explicitly — don't speculate as fact.",
    "Flag cross-department dependencies immediately, don't bury them.",
    "Use concrete examples over abstract descriptions.",
  ],
  escalationProtocol: [
    "If a decision requires the founder, tag it with [FOUNDER DECISION REQUIRED].",
    "If blocked by another department, tag with [BLOCKED: <dept>].",
    "If a risk is critical (could kill the feature), tag with [CRITICAL RISK].",
    "If scope is unclear, stop and ask — don't assume and overwork.",
  ],
};

function buildMeetingRulesBlock(phase) {
  const timebox = MEETING_RULES.timeboxes[phase] ?? "Stay focused and concise.";
  const format = MEETING_RULES.formatRules.map((r) => `- ${r}`).join("\n");
  const escalation = MEETING_RULES.escalationProtocol.map((r) => `- ${r}`).join("\n");

  return `
─── MEETING RULES ───────────────────────────────────────
TIMEBOX: ${timebox}

FORMAT RULES:
${format}

ESCALATION PROTOCOL:
${escalation}
─────────────────────────────────────────────────────────`;
}

function injectMeetingRules(systemPrompt, phase) {
  return `${systemPrompt}\n\n${buildMeetingRulesBlock(phase)}`;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN_ONLY = args.includes("--dry-run");
const filteredArgs = args.filter((a) => a !== "--dry-run");
const dept = filteredArgs[0];
const task = filteredArgs.slice(1).join(" ");

let DRY_RUN = false;


// ─── TOKEN BUDGET HELPERS ─────────────────────────────────────────────────────

function initDeptTokens(deptKey) {
  if (!deptTokens[deptKey]) {
    deptTokens[deptKey] = { input: 0, output: 0 };
  }
}

function recordTokens(deptKey, inputTokens, outputTokens = 0) {
  initDeptTokens(deptKey);
  deptTokens[deptKey].input += inputTokens;
  deptTokens[deptKey].output += outputTokens;
  totalInputTokens += inputTokens;
  totalOutputTokens += outputTokens;
}

function getBudgetUsed() {
  return totalInputTokens + totalOutputTokens;
}

function getBudgetPercent() {
  return getBudgetUsed() / MAX_TOKENS_PER_RUN;
}

function checkBudget(phase, phaseTokens) {
  const phaseLimit = PHASE_TOKEN_LIMITS[phase] ?? 2000;
  const budgetUsed = getBudgetUsed();
  const budgetPct = getBudgetPercent();

  // Phase-level warning
  if (phaseTokens > phaseLimit) {
    console.warn(
      `  ⚠️  Phase token estimate (${phaseTokens}) exceeds phase limit for "${phase}" (${phaseLimit})`
    );
  }

  // Global 80% warning
  if (budgetPct >= TOKEN_WARNING_THRESHOLD && budgetPct < 1.0) {
    console.warn(
      `  ⚠️  TOKEN BUDGET WARNING: ${Math.round(budgetPct * 100)}% used (${budgetUsed}/${MAX_TOKENS_PER_RUN})`
    );
  }

  // Global hard stop at 100%
  if (budgetUsed >= MAX_TOKENS_PER_RUN) {
    earlyStop = true;
    console.error(
      `  🛑 TOKEN BUDGET EXHAUSTED: ${budgetUsed}/${MAX_TOKENS_PER_RUN} tokens used. Stopping.`
    );
  }

  return earlyStop;
}

// ─── CORE CHAT ────────────────────────────────────────────────────────────────

async function estimateTokens(systemPrompt, messages) {
  const response = await client.messages.countTokens({
    model: MODEL,
    system: systemPrompt,
    messages: messages,
  });
  return response.input_tokens;
}

async function chat(systemPrompt, messages, { deptKey = "unknown", phase = "unknown" } = {}) {
  const inputEstimate = await estimateTokens(systemPrompt, messages);

  // Check budget before calling
  const stopped = checkBudget(phase, inputEstimate);
  if (stopped) {
    return "[stopped — token budget exhausted]";
  }

  if (DRY_RUN) {
    const sysP =
      systemPrompt.slice(0, 150).replace(/\n/g, " ") +
      (systemPrompt.length > 150 ? "…" : "");
    const last = messages[messages.length - 1];
    const msgP =
      String(last.content).slice(0, 200).replace(/\n/g, " ") +
      (String(last.content).length > 200 ? "…" : "");
    console.log(`  ┌ SYSTEM: ${sysP}`);
    console.log(`  │ ${last.role.toUpperCase()}: ${msgP}`);
    console.log(`  └ ~${inputEstimate} input tokens (phase: ${phase}, limit: ${PHASE_TOKEN_LIMITS[phase] ?? "n/a"})\n`);

    // Still record estimated tokens so dry-run budget tracking works
    recordTokens(deptKey, inputEstimate, 0);
    return "[dry-run — skipped]";
  }

  console.log(
    `  [~${inputEstimate} input tokens | phase: ${phase} | budget: ${getBudgetUsed()}/${MAX_TOKENS_PER_RUN}]`
  );

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: systemPrompt,
        messages: messages,
      });

      const outputTokens = response.usage?.output_tokens ?? 0;
      recordTokens(deptKey, inputEstimate, outputTokens);

      console.log(`  [output tokens: ${outputTokens}]`);
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

// ─── DEPARTMENT RUNNER ────────────────────────────────────────────────────────

async function runDepartment(deptKey, task) {
  const dept = DEPARTMENTS[deptKey];
  if (!dept) {
    console.error(`Unknown department: ${deptKey}`);
    console.log("Available:", Object.keys(DEPARTMENTS).join(", "));
    process.exit(1);
  }

  initDeptTokens(deptKey);

  const deptDir = path.join(__dirname, "departments", deptKey);
  fs.mkdirSync(deptDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  console.log(`\n=== ${dept.name} — Department Work ===`);
  console.log(`Task: ${task}`);
  console.log(`Token budget: ${MAX_TOKENS_PER_RUN} total | per-phase limits: research=${PHASE_TOKEN_LIMITS.research}, deepWork=${PHASE_TOKEN_LIMITS.deepWork}, report=${PHASE_TOKEN_LIMITS.report}\n`);

  // ── Phase 1: Research ──────────────────────────────────────────────────────
  console.log("[Phase 1] Researching...");
  const researchSystem = injectMeetingRules(dept.system, "research");

  const research = await chat(
    researchSystem,
    [
      {
        role: "user",
        content: `Task: ${task}\n\nFirst, break this task down. What do you need to research and figure out? List the key questions and areas to investigate. Be thorough but respect your timebox.`,
      },
    ],
    { deptKey, phase: "research" }
  );
  console.log(research);

  // Early stop check between phases
  if (earlyStop) {
    console.warn("\n⚠️  Early stop triggered after Phase 1. Skipping remaining phases.");
    printTokenSummary();
    return null;
  }

  // ── Phase 2: Deep Work ─────────────────────────────────────────────────────
  console.log("\n[Phase 2] Doing deep work...");
  const deepWorkSystem = injectMeetingRules(dept.system, "deepWork");

  const deepWork = await chat(
    deepWorkSystem,
    [
      { role: "user", content: `Task: ${task}` },
      { role: "assistant", content: research },
      {
        role: "user",
        content: `Good. Now do the actual work. For each area you identified, provide concrete recommendations, specific decisions, and actionable deliverables. Be detailed and practical. Respect your timebox — prioritize the top 3 issues.`,
      },
    ],
    { deptKey, phase: "deepWork" }
  );
  console.log(deepWork);

  // Early stop check between phases
  if (earlyStop) {
    console.warn("\n⚠️  Early stop triggered after Phase 2. Skipping report phase.");
    printTokenSummary();
    return null;
  }

  // ── Phase 3: Final Report ──────────────────────────────────────────────────
  console.log("\n[Phase 3] Writing final report...");
  const reportSystem = injectMeetingRules(dept.system, "report");

  const report = await chat(
    reportSystem,
    [
      { role: "user", content: `Task: ${task}` },
      { role: "assistant", content: research },
      { role: "user", content: `Do the actual work.` },
      { role: "assistant", content: deepWork },
      {
        role: "user",
        content: `Now write your final department report in clean markdown. Include:\n- Executive summary (3 sentences)\n- Key decisions made\n- Deliverables with owners and dependencies\n- Risks and open questions for PM\n- What you need from other departments\n\nUse [FOUNDER DECISION REQUIRED], [BLOCKED: <dept>], or [CRITICAL RISK] tags where appropriate.`,
      },
    ],
    { deptKey, phase: "report" }
  );

  // Save report
  const reportFile = path.join(deptDir, `report-${timestamp}.md`);
  const reportContent = `# ${dept.name} — Department Report\n\n**Date:** ${new Date().toISOString()}\n**Task:** ${task}\n\n---\n\n${report}`;
  fs.writeFileSync(reportFile, reportContent);
  fs.writeFileSync(path.join(deptDir, "report.md"), reportContent);

  console.log(`\n✓ Report saved: departments/${deptKey}/report.md`);
  printTokenSummary();
  return reportFile;
}

// ─── PM RUNNER ────────────────────────────────────────────────────────────────

async function runPM() {
  const pm = DEPARTMENTS.pm;
  const deptKey = "pm";
  initDeptTokens(deptKey);

  console.log(`\n=== PM — Synthesizing Department Reports ===\n`);

  const deptReports = {};
  for (const d of ["tech", "marketing", "operations"]) {
    const reportPath = path.join(__dirname, "departments", d, "report.md");
    if (fs.existsSync(reportPath)) {
      deptReports[d] = fs.readFileSync(reportPath, "utf-8");
    }
  }

  if (Object.keys(deptReports).length === 0) {
    console.log("No department reports found. Run departments first.");
    process.exit(1);
  }

  const combined = Object.entries(deptReports)
    .map(([d, content]) => `## ${d.toUpperCase()} REPORT:\n${content}`)
    .join("\n\n---\n\n");

  const pmSystem = injectMeetingRules(pm.system, "report");

  const synthesis = await chat(
    pmSystem,
    [
      {
        role: "user",
        content: `Here are the department reports:\n\n${combined}\n\nReview these reports. Identify conflicts, gaps, and dependencies. Synthesize into a unified action plan with clear priorities, timeline, and ownership. Use [FOUNDER DECISION REQUIRED], [BLOCKED: <dept>], and [CRITICAL RISK] tags where appropriate.`,
      },
    ],
    { deptKey, phase: "report" }
  );

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

// ─── SUMMARY ─────────────────────────────────────────────────────────────────

function printTokenSummary() {
  const totalUsed = getBudgetUsed();
  const budgetPct = Math.round(getBudgetPercent() * 100);

  const inputCost = ((totalInputTokens / 1000) * COST_PER_1K_INPUT).toFixed(4);
  const outputCost = ((totalOutputTokens / 1000) * COST_PER_1K_OUTPUT).toFixed(4);
  const totalCost = (parseFloat(inputCost) + parseFloat(outputCost)).toFixed(4);

  console.log(`\n${"─".repeat(50)}`);
  console.log(`TOKEN SUMMARY`);
  console.log(`${"─".repeat(50)}`);
  console.log(`  Budget used:    ${totalUsed} / ${MAX_TOKENS_PER_RUN} (${budgetPct}%)`);
  console.log(`  Input tokens:   ${totalInputTokens}  → $${inputCost}`);
  console.log(`  Output tokens:  ${totalOutputTokens}  → $${outputCost}`);
  console.log(`  Total cost:     ~$${totalCost}`);

  // Per-department breakdown
  if (Object.keys(deptTokens).length > 0) {
    console.log(`\n  Per-department breakdown:`);
    for (const [key, counts] of Object.entries(deptTokens)) {
      const deptTotal = counts.input + counts.output;
      const deptCost = (
        (counts.input / 1000) * COST_PER_1K_INPUT +
        (counts.output / 1000) * COST_PER_1K_OUTPUT
      ).toFixed(4);
      console.log(
        `    ${key.padEnd(12)} in: ${String(counts.input).padStart(5)}  out: ${String(counts.output).padStart(5)}  total: ${String(deptTotal).padStart(6)}  cost: $${deptCost}`
      );
    }
  }

  if (earlyStop) {
    console.log(`\n  🛑 Run ended early — budget ceiling hit.`);
  }

  console.log(`${"─".repeat(50)}\n`);
}

// ─── CONFIRM HELPER ──────────────────────────────────────────────────────────

function askConfirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  if (dept === "pm" || (dept && task)) {
    // Phase 1: dry-run estimate
    DRY_RUN = true;
    console.log("\n🔍 DRY RUN — estimating prompts and tokens...\n");
    if (dept === "pm") {
      await runPM();
    } else {
      await runDepartment(dept, task);
    }

    if (DRY_RUN_ONLY) {
      console.log("(--dry-run flag set, exiting before real run)");
      process.exit(0);
    }

    // Reset counters for real run
    totalInputTokens = 0;
    totalOutputTokens = 0;
    earlyStop = false;
    for (const key of Object.keys(deptTokens)) delete deptTokens[key];

    // Confirm before real run
    const go = await askConfirm("\nProceed with real run? [y/N] ");
    if (!go) {
      console.log("Aborted.");
      process.exit(0);
    }

    // Phase 2: real run
    DRY_RUN = false;
    console.log("\n🚀 Running real pipeline...\n");
    if (dept === "pm") {
      await runPM();
    } else {
      await runDepartment(dept, task);
    }
  } else {
    console.log(`
Usage:
  node department.js <dept> <task>         Run a department with a task
  node department.js <dept> --dry-run <task>  Estimate tokens only, no API calls
  node department.js pm                    PM synthesizes all department reports

Departments: tech, marketing, operations, pm

Examples:
  node department.js tech "Design the MVP architecture for project boards"
  node department.js tech --dry-run "Design the MVP architecture"
  node department.js marketing "Plan the invite-only beta launch messaging"
  node department.js operations "Build the product catalog curation plan"
  node department.js pm
`);
  }
}

main().catch(console.error);