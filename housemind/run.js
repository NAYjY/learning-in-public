// run.js — Multi-agent meeting with full token budget system
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { fileURLToPath } from "url";
import { meetingAgents as agents } from "./agents.js";
import { checkCacheHealth, checkPromptConsistency, sanitizeForCache } from "./cacheHealth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KEY_FILE = path.join(__dirname, "..", "key.txt");
const apiKey = fs.readFileSync(KEY_FILE, "utf-8").trim();
const client = new Anthropic({ apiKey });

const MODEL = "claude-sonnet-4-5";
const COST_PER_1K_INPUT = 0.003;
const COST_PER_1K_OUTPUT = 0.015;
const OUTPUT_LIMIT = 150;
// ─── TOKEN BUDGET ─────────────────────────────────────────────────────────────
const MAX_TOKENS_PER_MEETING = 6480000;//15000;
const TOKEN_WARNING_THRESHOLD = 0.8; // 80%

// Per-agent tracking
const agentTokens = {}; // { agentKey: { input: 0, output: 0 } }

let totalInputTokens = 0;
let totalOutputTokens = 0;
let earlyStop = false;

// ─── MEETING RULES ────────────────────────────────────────────────────────────
const MEETING_RULES = {
  formatRules: [
    "Begin your response directly with your content — never prefix with your name or role.",
    "Keep responses under 5 sentences unless synthesizing.",
    "Lead with your position. Don't hedge.",
    "If you disagree, say why specifically.",
    "End with a question or challenge to keep the discussion moving.",
    "Flag cross-department dependencies with [BLOCKED: <dept>].",
  ],
  escalationProtocol: [
    "If a decision requires the founder, tag it with [FOUNDER DECISION REQUIRED].",
    "If a risk is critical, tag with [CRITICAL RISK].",
    "If scope is unclear, ask — don't assume.",
  ],
};

function buildMeetingRulesBlock() {
  // const format = MEETING_RULES.formatRules.map((r) => `- ${r}`).join("\n");
  // const escalation = MEETING_RULES.escalationProtocol.map((r) => `- ${r}`).join("\n");
  const context = loadContext();

  return sanitizeForCache(`
─── MEETING RULES ───────────────────────────────────────
You are [AGENT ROLE] in an executive meeting.

Format rules:
- Begin directly with your content. Never prefix with your name or role.
- Keep responses under 5 sentences unless synthesizing a decision.
- Lead with your position. Do not hedge.
- If you disagree, say exactly why — be specific.
- End every turn with a question or challenge to keep discussion moving.
- Flag cross-department dependencies: [BLOCKED: ]

Escalation protocol:
- [FOUNDER DECISION REQUIRED] — only when no agent can own the decision
- [CRITICAL RISK] — real blockers only, not speculation
- If scope is unclear, ask — do not assume

Spend policy:
Prefer inhouse or self-hosted. API calls (Anthropic, OpenAI, Google) and cloud infra serving a live product need are pre-approved. Do not ask for spend approval mid-meeting. Flag only if the cost category is new or exceeds $500/month — and only once.

Timeline rule:
You may flag a timeline risk once. After flagging, propose an MVP scope reduction or a parallel workstream. Do not repeat the concern without a concrete proposal attached.

Phase: pre-MVP. Priority is plan → coordination → decision. Budget and timeline are constraints to acknowledge, not topics to debate.
─────────────────────────────────────────────────────────
## BRIEFING — READ BEFORE SPEAKING:\n${context}\n\n---
─────────────────────────────────────────────────────────`);

}

function injectMeetingRules(systemPrompt) {
  return `${systemPrompt}\n\n${buildMeetingRulesBlock()}`;
}

function getSystemPrompt() {
  let agentsPromt = ``;
  for (const agentKey of Object.keys(agents)) {
    agentsPromt = sanitizeForCache(
      `${agentsPromt}\n\n${agents[agentKey].system}\n\n`
    );
  }
  return `${buildMeetingRulesBlock()}\n${agentsPromt}\n\n`;
}


// ─── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN_ONLY = args.includes("--dry-run");
const filteredArgs = args.filter((a) => a !== "--dry-run");
let DRY_RUN = false;

const MAX_ROUNDS = 4;

// ─── LOGGING ──────────────────────────────────────────────────────────────────
const logsDir = path.join(__dirname, "logs");
fs.mkdirSync(logsDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const logFile = path.join(logsDir, `meeting-${timestamp}.md`);

function log(text) {
  if (!DRY_RUN) {
    fs.appendFileSync(logFile, text + "\n");
  }
}

// ─── CONTEXT LOADER ───────────────────────────────────────────────────────────
function loadContext() {
  const parts = [];
  const deptDir = path.join(__dirname, "departments");

  for (const dept of ["tech", "marketing", "operations", "pm"]) {
    const reportPath = path.join(deptDir, dept, "report.md");
    if (fs.existsSync(reportPath)) {
      const content = fs.readFileSync(reportPath, "utf-8");
      parts.push(sanitizeForCache(`## ${dept.toUpperCase()} REPORT:\n${content.slice(0, 2000)}`));
    }
    const teamReportPath = path.join(deptDir, dept, "team-report.md");
    if (fs.existsSync(teamReportPath)) {
      const content = fs.readFileSync(teamReportPath, "utf-8");
      parts.push(sanitizeForCache(`## ${dept.toUpperCase()} TEAM REPORT:\n${content.slice(0, 1500)}`));
    }
  }

  // Add last meeting log if available
  if (fs.existsSync(logsDir)) {
    const files = fs
      .readdirSync(logsDir)
      .filter((f) => f.startsWith("meeting-") && f.endsWith(".md"))
      .sort();
    if (files.length > 0) {
      const lastLog = files[files.length - 1];
      const logPath = path.join(logsDir, lastLog);
      const logContent = fs.readFileSync(logPath, "utf-8");
      // parts.push(`## LAST MEETING LOG (${lastLog}):\n${logContent.slice(-3000)}`);
      parts.push(sanitizeForCache(`## LAST MEETING LOG:\n${logContent.slice(-3000)}`));
    }
  }

  return sanitizeForCache(parts.join("\n\n---\n\n")); 
}

// ─── TOKEN BUDGET HELPERS ─────────────────────────────────────────────────────
function initAgentTokens(agentKey) {
  if (!agentTokens[agentKey]) {
    agentTokens[agentKey] = { input: 0, output: 0 };
  }
}

function recordTokens(agentKey, inputTokens, outputTokens = 0) {
  initAgentTokens(agentKey);
  agentTokens[agentKey].input += inputTokens;
  agentTokens[agentKey].output += outputTokens;
  totalInputTokens += inputTokens;
  totalOutputTokens += outputTokens;
}

function getBudgetUsed() {
  return totalInputTokens + totalOutputTokens;
}

function getBudgetPercent() {
  return getBudgetUsed() / MAX_TOKENS_PER_MEETING;
}

function checkBudget() {
  const budgetUsed = getBudgetUsed();
  const budgetPct = getBudgetPercent();

  // 80% warning
  if (budgetPct >= TOKEN_WARNING_THRESHOLD && budgetPct < 1.0) {
    console.warn(
      `  ⚠️  TOKEN BUDGET WARNING: ${Math.round(budgetPct * 100)}% used (${budgetUsed}/${MAX_TOKENS_PER_MEETING})`
    );
  }

  // 100% hard stop
  if (budgetUsed >= MAX_TOKENS_PER_MEETING) {
    earlyStop = true;
    console.error(
      `  🛑 TOKEN BUDGET EXHAUSTED: ${budgetUsed}/${MAX_TOKENS_PER_MEETING} tokens used. Stopping meeting.`
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
const fixpromt= getSystemPrompt();
async function chat(agentKey, history) {
  const agent = agents[agentKey];
  if (!agent) {
    console.error(`Unknown agent: ${agentKey}`);
    return "[error — unknown agent]";
  }

  // const systemPrompt = agentSystemPrompts[agentKey];
  const systemPrompt = fixpromt;
  const consistency = checkPromptConsistency(agentKey, systemPrompt);
  if (!consistency.consistent) {
    console.warn(consistency.message);
  }
  const inputEstimate = await estimateTokens(systemPrompt, history);

  // Check budget before calling
  if (checkBudget()) {
    return "[stopped — token budget exhausted]";
  }

  if (DRY_RUN) {
    const sysP =
      systemPrompt.slice(0, 150).replace(/\n/g, " ") +
      (systemPrompt.length > 150 ? "…" : "");
    const last = history[history.length - 1];
    const msgP =
      String(last.content).slice(0, 200).replace(/\n/g, " ") +
      (String(last.content).length > 200 ? "…" : "");
    console.log(`  ┌ [${agent.name}] SYSTEM: ${sysP}`);
    console.log(`  │ ${last.role.toUpperCase()}: ${msgP}`);
    console.log(
      `  └ ~${inputEstimate} input tokens | budget: ${getBudgetUsed()}/${MAX_TOKENS_PER_MEETING}\n`
    );

    recordTokens(agentKey, inputEstimate, OUTPUT_LIMIT);
    return "[dry-run — skipped]";
  }

  console.log(
    `  [${agent.name}: ~${inputEstimate} input | budget: ${getBudgetUsed()}/${MAX_TOKENS_PER_MEETING}]`
  );

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: OUTPUT_LIMIT,
        // system: systemPrompt,
        system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" }
        }
      ],
        messages: history,
      });

      console.log({
      cache_created: response.usage.cache_creation_input_tokens ?? 0,
      cache_read:    response.usage.cache_read_input_tokens ?? 0,
      });

      const outputTokens = response.usage?.output_tokens ?? 0;
      recordTokens(agentKey, inputEstimate, outputTokens);

      console.log(`  [output: ${outputTokens} tokens]`);
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

// ─── MEETING RUNNER ───────────────────────────────────────────────────────────
function formatMessage(speaker, text) {
  const msg = `\n[${speaker}]\n${text}\n`;
  console.log(msg);
  log(`### ${speaker}\n\n${text}\n`);
}

async function runMeeting(topic) {
  const history = [];
  // const context = loadContext();

  console.log("\n--- Meeting started ---");
  console.log(`Topic: ${topic}`);
  console.log(
    `Token budget: ${MAX_TOKENS_PER_MEETING} | Warning at ${TOKEN_WARNING_THRESHOLD * 100}%\n`
  );
  log(`# Meeting Log\n`);
  log(`**Date:** ${new Date().toISOString()}\n`);
  log(`**Topic:** ${topic}\n`);
  log(`---\n`);

  // const opening = context
  //   ? `## BRIEFING — READ BEFORE SPEAKING:\n${context}\n\n---\n\nWe need to discuss: ${topic}. Marketing, what's your take?`
  //   : `We need to discuss: ${topic}. Marketing, what's your take?`;
    const opening = `We need to discuss: ${topic}.`;

  history.push({ role: "user", content: opening });

  let round = 0;
  while (round < MAX_ROUNDS && !earlyStop) {
    round++;
    log(`## Round ${round}\n`);
    console.log(`\n--- Round ${round} ---`);

    for (const role of ["marketing", "operations", "tech"]) {
      if (earlyStop) break;

      history.push({ role: "user", content: ` ${role.charAt(0).toUpperCase() + role.slice(1)}, what's your take?` });

      const reply = await chat(role, history);
      formatMessage(agents[role].name, reply);

      if (reply.includes("[stopped")) break;

      history.push({
        role: "assistant",
        content: `${reply}`,
      });
      
    }
  }

  if (earlyStop) {
    console.log("\n⚠️  Meeting ended early due to token budget.");
    log(`\n---\n\n**Meeting ended early — token budget exhausted.**\n`);
  }

  // PM summary (if budget allows)
  if (!earlyStop) {
    console.log("\n--- PM steps in ---");
    log(`## PM Summary\n`);
    history.push({ role: "user", content: ` Manager, Now provide meeting summary.` });
    const pmReply = await chat("manager", history);
    formatMessage(agents.manager.name, pmReply);
  }

  return;
}

// ─── TOKEN SUMMARY ────────────────────────────────────────────────────────────
function printTokenSummary() {
  const totalUsed = getBudgetUsed();
  const budgetPct = Math.round(getBudgetPercent() * 100);

  const inputCost = ((totalInputTokens / 1000) * COST_PER_1K_INPUT).toFixed(4);
  const outputCost = ((totalOutputTokens / 1000) * COST_PER_1K_OUTPUT).toFixed(4);
  const totalCost = (parseFloat(inputCost) + parseFloat(outputCost)).toFixed(4);

  console.log(`\n${"─".repeat(50)}`);
  console.log(`TOKEN SUMMARY`);
  console.log(`${"─".repeat(50)}`);
  console.log(
    `  Budget used:    ${totalUsed} / ${MAX_TOKENS_PER_MEETING} (${budgetPct}%)`
  );
  console.log(`  Input tokens:   ${totalInputTokens}  → $${inputCost}`);
  console.log(`  Output tokens:  ${totalOutputTokens}  → $${outputCost}`);
  console.log(`  Total cost:     ~$${totalCost}`);

  // Per-agent breakdown
  if (Object.keys(agentTokens).length > 0) {
    console.log(`\n  Per-agent breakdown:`);
    for (const [key, counts] of Object.entries(agentTokens)) {
      const agentTotal = counts.input + counts.output;
      const agentCost = (
        (counts.input / 1000) * COST_PER_1K_INPUT +
        (counts.output / 1000) * COST_PER_1K_OUTPUT
      ).toFixed(4);
      console.log(
        `    ${key.padEnd(12)} in: ${String(counts.input).padStart(5)}  out: ${String(counts.output).padStart(5)}  total: ${String(agentTotal).padStart(6)}  cost: $${agentCost}`
      );
    }
  }

  if (earlyStop) {
    console.log(`\n  🛑 Meeting ended early — budget ceiling hit.`);
  }

  console.log(`${"─".repeat(50)}\n`);
}

// ─── RESET STATE ──────────────────────────────────────────────────────────────
function resetState() {
  totalInputTokens = 0;
  totalOutputTokens = 0;
  earlyStop = false;
  for (const key of Object.keys(agentTokens)) delete agentTokens[key];
}

// ─── CONFIRM HELPER ───────────────────────────────────────────────────────────
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
  const topic =
    filteredArgs[0] ||
    "What should we build first — supplier onboarding or the owner visualization tool?";
  await checkCacheHealth(agents, injectMeetingRules, client, MODEL);
  // Phase 1: dry-run estimate
  DRY_RUN = true;
  console.log("\n🔍 DRY RUN — estimating prompts and tokens...\n");
  await runMeeting(topic);
  printTokenSummary();

  if (DRY_RUN_ONLY) {
    console.log("(--dry-run flag set, exiting before real run)");
    process.exit(0);
  }

  // Reset for real run
  resetState();

  // Confirm before real run
  const go = await askConfirm("Proceed with real run? [y/N] ");
  if (!go) {
    console.log("Aborted.");
    process.exit(0);
  }

  // Phase 2: real run
  DRY_RUN = false;
  console.log("\n🚀 Running real meeting...\n");
  await runMeeting(topic);
  printTokenSummary();

  console.log(`Meeting log saved to: ${logFile}\n`);
}

main().catch(console.error);