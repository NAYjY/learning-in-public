import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { fileURLToPath } from "url";
import { agents } from "./agents.js";

// ─── Load all project context ───
function loadContext() {
  const parts = [];
  const deptDir = path.join(__dirname, "departments");
  for (const dept of ["tech", "marketing", "operations", "pm"]) {
    const reportPath = path.join(deptDir, dept, "report.md");
    if (fs.existsSync(reportPath)) {
      const content = fs.readFileSync(reportPath, "utf-8");
      // Truncate each report to stay under token limits
      parts.push(`## ${dept.toUpperCase()} REPORT:\n${content.slice(0, 2000)}`);
    }
    const teamReportPath = path.join(deptDir, dept, "team-report.md");
    if (fs.existsSync(teamReportPath)) {
      const content = fs.readFileSync(teamReportPath, "utf-8");
      parts.push(`## ${dept.toUpperCase()} TEAM REPORT:\n${content.slice(0, 1500)}`);
    }
  }

  // Add last meeting log if available
  const logsDir = path.join(__dirname, "logs");
  let lastMeeting = null;
  if (fs.existsSync(logsDir)) {
    const files = fs.readdirSync(logsDir)
      .filter(f => f.startsWith("meeting-") && f.endsWith(".md"))
      .sort();
    if (files.length > 0) {
      const lastLog = files[files.length - 1];
      const logPath = path.join(logsDir, lastLog);
      const logContent = fs.readFileSync(logPath, "utf-8");
      // Only include the last ~3000 chars to avoid token overflow
      parts.push(`## LAST MEETING LOG (${lastLog}):\n${logContent.slice(-3000)}`);
    }
  }

  return parts.join("\n\n---\n\n");
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, "logs");
fs.mkdirSync(logsDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const logFile = path.join(logsDir, `meeting-${timestamp}.md`);

function log(text) {
  fs.appendFileSync(logFile, text + "\n");
}

const KEY_FILE = path.join(__dirname, "..", "key.txt");
const apiKey = fs.readFileSync(KEY_FILE, "utf-8").trim();
const client = new Anthropic({ apiKey });

const args = process.argv.slice(2);
const DRY_RUN_ONLY = args.includes("--dry-run");
const filteredArgs = args.filter((a) => a !== "--dry-run");
let DRY_RUN = false;
let totalTokens = 0;

const MODEL = "claude-sonnet-4-5";
// const MODEL = "claude-opus-4-5";
const COST_PER_1K_INPUT = 0.003; // Sonnet input pricing

async function estimateTokens(systemPrompt, messages) {
  const response = await client.messages.countTokens({
    model: MODEL,
    system: systemPrompt,
    messages: messages,
  });
  return response.input_tokens;
}

const MAX_ROUNDS = 4;

async function chat(agentKey, history) {
  const agent = agents[agentKey];
  const tokens = await estimateTokens(agent.system, history);
  totalTokens += tokens;

  if (DRY_RUN) {
    const sysP = agent.system.slice(0, 150).replace(/\n/g, " ") + (agent.system.length > 150 ? "…" : "");
    const last = history[history.length - 1];
    const msgP = String(last.content).slice(0, 200).replace(/\n/g, " ") + (String(last.content).length > 200 ? "…" : "");
    console.log(`  ┌ [${agent.name}] SYSTEM: ${sysP}`);
    console.log(`  │ ${last.role.toUpperCase()}: ${msgP}`);
    console.log(`  └ ~${tokens} tokens\n`);
    return "[dry-run — skipped]";
  }
  console.log(`  [${agent.name}: ~${tokens} input tokens]`);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 400,
        system: agent.system,
        messages: history,
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

function formatMessage(speaker, text) {
  const msg = `\n[${speaker}]\n${text}\n`;
  console.log(msg);
  log(`### ${speaker}\n\n${text}\n`);
}

async function runMeeting(topic) {
  const history = [];
  // Load project context and prepend as system message
  const context = loadContext();
  
  let round = 0;

  console.log("\n--- Meeting started ---");
  console.log(`Topic: ${topic}\n`);
  log(`# Meeting Log\n`);
  log(`**Date:** ${new Date().toISOString()}\n`);
  log(`**Topic:** ${topic}\n`);
  log(`---\n`);
  const opening = context
    ? `## BRIEFING — READ BEFORE SPEAKING:\n${context}\n\n---\n\nWe need to discuss: ${topic}. Marketing, what's your take?`
    : `We need to discuss: ${topic}. Marketing, what's your take?`;
  // const opening = `We need to discuss: ${topic}. Marketing, what's your take?`;
  history.push({ role: "user", content: opening });

  while (round < MAX_ROUNDS) {
    round++;
    log(`## Round ${round}\n`);

    for (const role of ["marketing", "operations", "tech"]) {
      const reply = await chat(role, history);
      formatMessage(agents[role].name, reply);
      history.push({ role: "assistant", content: `[${agents[role].name}]: ${reply}` });
      history.push({ role: "user", content: "Continue the discussion." });
    }
  }

  console.log("\n--- PM steps in ---");
  log(`## PM Summary\n`);
  const pmReply = await chat("manager", history);
  formatMessage(agents.manager.name, pmReply);

  return pmReply;
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
  const topic = filteredArgs[0] || "What should we build first — supplier onboarding or the owner visualization tool?";

  // // Phase 1: auto dry-run
  // DRY_RUN = true;
  // console.log("\n🔍 DRY RUN — estimating prompts and tokens...\n");
  // await runMeeting(topic);

  // const dryTokens = totalTokens;
  // const dryCost = ((dryTokens / 1000) * COST_PER_1K_INPUT).toFixed(4);
  // console.log(`\n——— Dry run complete ———`);
  // console.log(`Total input tokens: ~${dryTokens}`);
  // console.log(`Estimated input cost: ~$${dryCost}`);

  // if (DRY_RUN_ONLY) process.exit(0);

  // Confirm before real run
  const go = await askConfirm("\nProceed with real run? [y/N] ");
  if (!go) { console.log("Aborted."); process.exit(0); }

  // Phase 2: real run
  DRY_RUN = false;
  totalTokens = 0;
  console.log("\n🚀 Running real meeting...\n");
  await runMeeting(topic);

  const cost = ((totalTokens / 1000) * COST_PER_1K_INPUT).toFixed(4);
  console.log(`\n——— Meeting complete ———`);
  console.log(`Total input tokens: ~${totalTokens}`);
  console.log(`Estimated input cost: ~$${cost}`);
  console.log(`\nMeeting log saved to: ${logFile}\n`);
}

main().catch(console.error);
