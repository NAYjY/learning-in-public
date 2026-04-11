import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { fileURLToPath } from "url";
import { checkCacheHealth, checkPromptConsistency, sanitizeForCache } from "./cacheHealth.js";
import { TEAMS } from "./subAgentCompact.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KEY_FILE = path.join(__dirname, "..", "key.txt");
const apiKey = fs.readFileSync(KEY_FILE, "utf-8").trim();
const client = new Anthropic({ apiKey });

const MODEL = "claude-sonnet-4-5";
const COST_PER_1K_INPUT = 0.003;
const COST_PER_1K_OUTPUT = 0.015;

// ─── TOKEN BUDGET ─────────────────────────────────────────────────────────────
const MAX_TOKENS_PER_RUN = 250000; // Higher for team pipelines (multiple agents)
const MAX_ROUNDS = 3; // For iterative agent pipelines, to prevent infinite loops
const PHASE_TOKEN_LIMITS = {
  breakdown: 4000,
  agent: 150,
  // consolidate: 3000,
  // scrum: 1500,
};

const TOKEN_WARNING_THRESHOLD = 0.8;

// Per-team tracking
const teamTokens = {}; // { teamKey: { input: 0, output: 0 } }

let totalInputTokens = 0;
let totalOutputTokens = 0;
let earlyStop = false;
let DRY_RUN = false;

// ─── MEETING RULES ────────────────────────────────────────────────────────────
const MEETING_RULES = {
  timeboxes: {
    breakdown: "Max 5 minutes. Be decisive, not exhaustive.",
    agent: "Max 10 minutes per agent. Focus on your specialization only.",
    consolidate: "Max 10 minutes. Synthesize, don't repeat.",
    scrum: "Max 5 minutes per exchange. Be direct, flag blockers.",
  },
  formatRules: [
    "Begin your response directly with your content — never prefix with your name or role.",
    "Keep responses under 5 sentences unless synthesizing.",
    "Use headers and bullet points. No walls of text.",
    "Lead with the most important point.",
    "If uncertain, say so explicitly — don't speculate as fact.",
    "Flag cross-department dependencies immediately.",
    "Use concrete examples over abstract descriptions.",
  ],
  escalationProtocol: [
    "If a decision requires the founder, tag with [FOUNDER DECISION REQUIRED].",
    "If blocked by another department, tag with [BLOCKED: <dept>].",
    "If a risk is critical, tag with [CRITICAL RISK].",
    "If scope is unclear, stop and ask — don't assume.",
  ],
};

function buildMeetingRulesBlock(phase) {
  // const timebox = MEETING_RULES.timeboxes[phase] ?? "Stay focused and concise.";
  // TIMEBOX: ${timebox}
  const format = MEETING_RULES.formatRules.map((r) => `- ${r}`).join("\n");
  const escalation = MEETING_RULES.escalationProtocol.map((r) => `- ${r}`).join("\n");

  return `
─── MEETING RULES ───────────────────────────────────────
FORMAT RULES:
${format}

ESCALATION PROTOCOL:
${escalation}
─────────────────────────────────────────────────────────`;
}

function injectMeetingRules(systemPrompt, phase) {
  return `${systemPrompt}\n\n${buildMeetingRulesBlock(phase)}`;
}

function getSystemPrompt(breakdwon,team) {
  let agentsPromt = ``;
  for (const agentKey of Object.keys(team.agents)) {
    const agentData = team.agents[agentKey];
    agentsPromt = sanitizeForCache(
      `${agentsPromt}\n\n${agentKey}\t${agentData.system}\n\n`
    );
  }
  return sanitizeForCache(`Team Members:\n${agentsPromt}\n\n${breakdwon}\n\n${buildMeetingRulesBlock()}\n`);
}


// ─── TOKEN BUDGET HELPERS ─────────────────────────────────────────────────────

function initTeamTokens(teamKey) {
  if (!teamTokens[teamKey]) {
    teamTokens[teamKey] = { input: 0, output: 0 };
  }
}

function recordTokens(teamKey, inputTokens, outputTokens = 0) {
  initTeamTokens(teamKey);
  teamTokens[teamKey].input += inputTokens;
  teamTokens[teamKey].output += outputTokens;
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

  if (phaseTokens > phaseLimit) {
    console.warn(
      `  ⚠️  Phase estimate (${phaseTokens}) exceeds limit for "${phase}" (${phaseLimit})`
    );
  }

  if (budgetPct >= TOKEN_WARNING_THRESHOLD && budgetPct < 1.0) {
    console.warn(
      `  ⚠️  TOKEN WARNING: ${Math.round(budgetPct * 100)}% used (${budgetUsed}/${MAX_TOKENS_PER_RUN})`
    );
  }

  if (budgetUsed >= MAX_TOKENS_PER_RUN) {
    earlyStop = true;
    console.error(
      `  🛑 BUDGET EXHAUSTED: ${budgetUsed}/${MAX_TOKENS_PER_RUN}. Stopping.`
    );
  }

  return earlyStop;
}


// ─── Truncate text to stay within token budget ───
function truncate(text, maxChars = 3000) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n... [truncated] ...";
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

// ─── Token estimation ───
async function estimateTokens(systemPrompt, messages) {
  const response = await client.messages.countTokens({
    model: MODEL,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" }
      }
    ],
    messages: messages,
  });
  return response.input_tokens;
}


// ─── LLM call with retry ───
async function chat(systemPrompt, messages, { teamKey = "unknown", phase = "unknown", maxTokens = 400 } = {}) {

  const consistency = checkPromptConsistency(teamKey, systemPrompt);
    if (!consistency.consistent) {
      console.warn(consistency.message);
    }
  const inputEstimate = await estimateTokens(systemPrompt, messages);

  const stopped = checkBudget(phase, inputEstimate);
  if (stopped) {
    return "[stopped — token budget exhausted]";
  }

  if (DRY_RUN) {
    const sysP = systemPrompt.slice(0, 150).replace(/\n/g, " ") + (systemPrompt.length > 150 ? "…" : "");
    const last = messages[messages.length - 1];
    const msgP = String(last.content).slice(0, 200).replace(/\n/g, " ") + (String(last.content).length > 200 ? "…" : "");
    console.log(`  ┌ SYSTEM: ${sysP}`);
    console.log(`  │ ${last.role.toUpperCase()}: ${msgP}`);
    console.log(`  └ ~${inputEstimate} tokens (phase: ${phase}, limit: ${PHASE_TOKEN_LIMITS[phase] ?? "n/a"})\n`);
    recordTokens(teamKey, inputEstimate, 0);
    return "[dry-run — skipped]";
  }

  console.log(`  [~${inputEstimate} input | phase: ${phase} | budget: ${getBudgetUsed()}/${MAX_TOKENS_PER_RUN}]`);

  for (let attempt = 0; attempt < 7; attempt++) {
    await paceCall();
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        // system: systemPrompt,
        system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" }
        }
        ],
        messages: messages,
      });
      console.log({
      cache_created: response.usage.cache_creation_input_tokens ?? 0,
      cache_read:    response.usage.cache_read_input_tokens ?? 0,
      })

      const outputTokens = response.usage?.output_tokens ?? 0;
      recordTokens(teamKey, inputEstimate, outputTokens);
      console.log(`  [output: ${outputTokens} tokens]`);

      return response.content[0].text;
    } catch (err) {
      if (err.status === 429 && attempt < 6) {
        const wait = (attempt + 1) * 20;
        console.log(`  [rate limited — waiting ${wait}s...]`);
        await new Promise((r) => setTimeout(r, wait * 1000));
        lastCallTime = Date.now();
      } else if (err.status === 413 && attempt < 6) {
        console.log(`  [token limit — truncating...]`);
        messages = messages.map((m) => ({
          ...m,
          content: truncate(String(m.content), Math.floor(String(m.content).length * 0.6)),
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
  return `\n\nCONTEXT FROM OTHER DEPARTMENTS:\n${sections}\n\n`;
}

function loadBoardMeetingContext() {
  const parts = [];
  const logsDir = path.join(__dirname, "logs");
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
        parts.push(sanitizeForCache(`## Board MEETING LOG:\n${logContent.slice(-3000)}`));
      }
    }
    return sanitizeForCache(parts.join("\n\n---\n\n"));
}


// ─── Run a team pipeline ───
async function runTeam(teamKey, task) {
  const team = TEAMS[teamKey];
  if (!team) {
    console.error(`Unknown team: ${teamKey}`);
    console.log("Available teams:", Object.keys(TEAMS).join(", "));
    process.exit(1);
  }

  initTeamTokens(teamKey);

  const teamDir = path.join(__dirname, "departments", teamKey, "team-runs");
  fs.mkdirSync(teamDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = path.join(teamDir, timestamp);
  fs.mkdirSync(runDir, { recursive: true });

  // we will load it form other place then put to systemPrompt
  // const otherReports = getOtherTeamReports(teamKey);
  // const crossTeamContext = formatCrossTeamContext(otherReports);
  // if (otherReports.length > 0) {
  //   console.log(`\n📋 Loaded reports from: ${otherReports.map((r) => r.name).join(", ")}`);
  // }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${team.head.name} — Team Pipeline`);
  console.log(`  Task: ${task}`);
  console.log(`  Budget: ${MAX_TOKENS_PER_RUN} tokens`);
  console.log(`${"=".repeat(60)}\n`);

  // ── Phase 1: Head breakdown ──
  console.log(`[HEAD] Breaking down task...\n`);
  const headSystem = sanitizeForCache(injectMeetingRules(team.head.system, "breakdown"));
  const agentList = team.pipeline
    .map((k) => `- ${team.agents[k].name}: what should they do?`)
    .join("\n");

  const boardMeeting = loadBoardMeetingContext();

  const breakdown = await chat(headSystem, [
    {
      role: "user",
      content: `Task for your team: ${task}
From your perspective as ${team.head.name}, 
specifically what your team tasks from ${boardMeeting}
Break this into specific sub-tasks for each team member:
${agentList}
Be specific. Give each agent clear instructions.`,
    },
  ], { teamKey, phase: "breakdown", maxTokens: 400 });

  console.log(breakdown);
  fs.writeFileSync(path.join(runDir, "0-head-breakdown.md"), breakdown);

  if (earlyStop) {
    console.warn("\n⚠️  Early stop after breakdown. Skipping agents.");
    printTokenSummary();
    return;
  }

  // ── Phase 2: Run pipeline ──
  const outputs = {};
  let round = 0;
  const history = [];
  const fixpromt= getSystemPrompt(breakdown,team);
  while (round < MAX_ROUNDS && !earlyStop) {
    round++;
    console.log(`\n--- Round ${round} ---`);
  for (const agentKey of team.pipeline) {
    if (earlyStop) break;
     
    const agent = team.agents[agentKey];
    console.log(`\n${"─".repeat(40)}`);
    console.log(`[${agent.name.toUpperCase()}] Working...\n`);

    // let previousContext = "";
    // for (const [prevKey, prevOutput] of Object.entries(outputs)) {
    //   previousContext += `\n--- ${team.agents[prevKey].name} Output ---\n${truncate(prevOutput, 1500)}\n`;
    // }

    // const agentSystem = injectMeetingRules(agent.system, "agent");
    // Let move breake down to system prompt
    
    // const agentPrompt = previousContext
    //   ? `Previous outputs:\n${previousContext}\n\nNow do your part.`
    //   : `You are first. Do your part.`;
    history.push({ role: "user", content: `You are [${agent.name.toUpperCase()}]\nPlan your part.` });
    const output = await chat(fixpromt, history, { teamKey, phase: "agent" , maxTokens: 150});
    history.push({
        role: "assistant",
        content: `${output}`,
      });
    console.log(output);
    outputs[agentKey] = output;
    fs.writeFileSync(path.join(runDir, `${team.pipeline.indexOf(agentKey) + 1}-${agentKey}.md`), output);
  }

  if (earlyStop) {
    console.warn("\n⚠️  Early stop during pipeline. Skipping consolidation.");
    printTokenSummary();
    return;
  }
}

  // ── Phase 3: Head consolidates ──
  console.log(`\n${"─".repeat(40)}`);
  console.log(`[HEAD] Writing final report...\n`);

  let allOutputs = "";
  for (const [agentKey, output] of Object.entries(outputs)) {
    allOutputs += `\n## ${team.agents[agentKey].name}:\n${truncate(output, 1000)}\n\n---\n`;
  }

  const consolidateSystem = injectMeetingRules(team.head.system, "consolidate");
  const finalReport = await chat(consolidateSystem, [
    { role: "user", content: `Task: ${task}` },
    { role: "assistant", content: breakdown },
    {
      role: "user",
      content: `Team outputs:\n${allOutputs}\n\nWrite final report:
1. Summary
2. Each agent's output (brief)
3. Issues found
4. Ready to ship?
5. Deferred items
6. **HANDOFF** — for each other team (${Object.keys(TEAMS).filter((k) => k !== teamKey).join(", ")}): what they need to know, what you need from them.`,
    },
  ], { teamKey, phase: "consolidate", maxTokens: 2000 });

  console.log(finalReport);

  const reportContent = `# ${team.head.name} — Team Report

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
  const latestPath = path.join(__dirname, "departments", teamKey, "team-report.md");
  fs.writeFileSync(latestPath, reportContent);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ✓ Report: departments/${teamKey}/team-report.md`);
  console.log(`  ✓ Artifacts: departments/${teamKey}/team-runs/${timestamp}/`);
  console.log(`${"=".repeat(60)}`);
  printTokenSummary();
}

// // ─── Scrum: cross-team agent pairing ───
// const SCRUM_PAIRS = [
//   {
//     label: "UX ↔ Frontend",
//     a: { team: "marketing", agent: "ux", name: "UX Researcher" },
//     b: { team: "tech", agent: "frontend", name: "Frontend Dev" },
//     topic: "interaction patterns, touch UX feasibility",
//   },
//   {
//     label: "Art & UI ↔ Frontend",
//     a: { team: "marketing", agent: "artui", name: "Art & UI" },
//     b: { team: "tech", agent: "frontend", name: "Frontend Dev" },
//     topic: "visual specs, Tailwind, responsive layout",
//   },
//   {
//     label: "UX ↔ Database",
//     a: { team: "marketing", agent: "ux", name: "UX Researcher" },
//     b: { team: "tech", agent: "database", name: "Database Architect" },
//     topic: "data model vs UX flow limits",
//   },
//   {
//     label: "Content ↔ Backend",
//     a: { team: "marketing", agent: "content", name: "Content Writer" },
//     b: { team: "tech", agent: "backend", name: "Backend Dev" },
//     topic: "error messages, validation copy",
//   },
//   {
//     label: "Growth ↔ Backend",
//     a: { team: "marketing", agent: "growth", name: "Growth Lead" },
//     b: { team: "tech", agent: "backend", name: "Backend Dev" },
//     topic: "analytics events, tracking",
//   },
//   {
//     label: "Community ↔ UX",
//     a: { team: "marketing", agent: "community", name: "Community Manager" },
//     b: { team: "marketing", agent: "ux", name: "UX Researcher" },
//     topic: "user feedback, feature priorities",
//   },
// ];

// async function runScrum(task) {
//   const scrumDir = path.join(__dirname, "departments", "scrum-logs");
//   fs.mkdirSync(scrumDir, { recursive: true });
//   const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
//   const logFile = path.join(scrumDir, `scrum-${timestamp}.md`);

//   let log = `# Scrum Meeting\n\n**Date:** ${new Date().toISOString()}\n**Topic:** ${task}\n\n---\n\n`;

//   console.log(`\n${"=".repeat(60)}`);
//   console.log(`  🔄 SCRUM — Cross-Team Standup`);
//   console.log(`  Topic: ${task}`);
//   console.log(`  Budget: ${MAX_TOKENS_PER_RUN} tokens`);
//   console.log(`${"=".repeat(60)}`);

//   const allReports = getOtherTeamReports("__none__");
//   const reportContext = allReports.length > 0
//     ? allReports.map((r) => `--- ${r.name} ---\n${truncate(r.content, 1500)}`).join("\n\n")
//     : "No team reports yet.";

//   for (const pair of SCRUM_PAIRS) {
//     if (earlyStop) break;

//     const agentA = TEAMS[pair.a.team]?.agents[pair.a.agent];
//     const agentB = TEAMS[pair.b.team]?.agents[pair.b.agent];
//     if (!agentA || !agentB) continue;

//     console.log(`\n${"─".repeat(50)}`);
//     console.log(`  ${pair.label} — ${pair.topic}`);
//     console.log(`${"─".repeat(50)}`);
//     log += `## ${pair.label}\n**Focus:** ${pair.topic}\n\n`;

//     const systemA = injectMeetingRules(agentA.system, "scrum");
//     const systemB = injectMeetingRules(agentB.system, "scrum");

//     // Round 1
//     console.log(`\n[${pair.a.name}] →`);
//     const msgA = await chat(systemA, [
//       {
//         role: "user",
//         content: `SCRUM with ${pair.b.name} (${pair.b.team}).
// Topic: ${task}
// Focus: ${pair.topic}

// Context:\n${reportContext}

// Share 3-5 key concerns/questions for ${pair.b.name}.`,
//       },
//     ], { teamKey: pair.a.team, phase: "scrum" });
//     console.log(msgA);
//     log += `### ${pair.a.name}\n${msgA}\n\n`;

//     if (earlyStop) break;

//     // Round 2
//     console.log(`\n[${pair.b.name}] →`);
//     const msgB = await chat(systemB, [
//       {
//         role: "user",
//         content: `SCRUM with ${pair.a.name} (${pair.a.team}).
// Topic: ${task}
// Focus: ${pair.topic}

// Context:\n${reportContext}

// ${pair.a.name} said:\n${msgA}

// Respond directly. What can you commit to?`,
//       },
//     ], { teamKey: pair.b.team, phase: "scrum" });
//     console.log(msgB);
//     log += `### ${pair.b.name}\n${msgB}\n\n`;

//     if (earlyStop) break;

//     // Round 3
//     console.log(`\n[${pair.a.name}] (follow-up) →`);
//     const msgA2 = await chat(systemA, [
//       {
//         role: "user",
//         content: `Follow-up with ${pair.b.name}.

// You said:\n${msgA}

// They said:\n${msgB}

// Final concerns? 2-3 sentences. End with AGREED and UNRESOLVED.`,
//       },
//     ], { teamKey: pair.a.team, phase: "scrum" });
//     console.log(msgA2);
//     log += `### ${pair.a.name} (follow-up)\n${msgA2}\n\n---\n\n`;
//   }

//   fs.writeFileSync(logFile, log);
//   console.log(`\n${"=".repeat(60)}`);
//   console.log(`  ✓ Scrum log: departments/scrum-logs/scrum-${timestamp}.md`);
//   console.log(`${"=".repeat(60)}`);
//   printTokenSummary();
// }

// ─── Token Summary ───
function printTokenSummary() {
  const totalUsed = getBudgetUsed();
  const budgetPct = Math.round(getBudgetPercent() * 100);

  const inputCost = ((totalInputTokens / 1000) * COST_PER_1K_INPUT).toFixed(4);
  const outputCost = ((totalOutputTokens / 1000) * COST_PER_1K_OUTPUT).toFixed(4);
  const totalCost = (parseFloat(inputCost) + parseFloat(outputCost)).toFixed(4);

  console.log(`\n${"─".repeat(50)}`);
  console.log(`TOKEN SUMMARY`);
  console.log(`${"─".repeat(50)}`);
  console.log(`  Budget:  ${totalUsed} / ${MAX_TOKENS_PER_RUN} (${budgetPct}%)`);
  console.log(`  Input:   ${totalInputTokens}  → $${inputCost}`);
  console.log(`  Output:  ${totalOutputTokens}  → $${outputCost}`);
  console.log(`  Total:   ~$${totalCost}`);

  if (Object.keys(teamTokens).length > 0) {
    console.log(`\n  Per-team breakdown:`);
    for (const [key, counts] of Object.entries(teamTokens)) {
      const t = counts.input + counts.output;
      const c = ((counts.input / 1000) * COST_PER_1K_INPUT + (counts.output / 1000) * COST_PER_1K_OUTPUT).toFixed(4);
      console.log(`    ${key.padEnd(12)} in:${String(counts.input).padStart(5)} out:${String(counts.output).padStart(5)} = ${String(t).padStart(6)}  $${c}`);
    }
  }

  if (earlyStop) {
    console.log(`\n  🛑 Run ended early — budget exhausted.`);
  }
  console.log(`${"─".repeat(50)}\n`);
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

function resetState() {
  totalInputTokens = 0;
  totalOutputTokens = 0;
  earlyStop = false;
  for (const key of Object.keys(teamTokens)) delete teamTokens[key];
}

async function main() {
  if ((teamArg === "scrum" && taskArg) || (teamArg && taskArg)) {
    await checkCacheHealth(TEAMS, injectMeetingRules, client, MODEL);
    // Dry run
    DRY_RUN = true;
    console.log("\n🔍 DRY RUN — estimating tokens...\n");
    if (teamArg === "scrum") {
      await runScrum(taskArg);
    } else {
      await runTeam(teamArg, taskArg);
    }

    if (DRY_RUN_ONLY) process.exit(0);

    const go = await askConfirm("\nProceed with real run? [y/N] ");
    if (!go) {
      console.log("Aborted.");
      process.exit(0);
    }

    // Real run
    resetState();
    DRY_RUN = false;
    console.log("\n🚀 Running real pipeline...\n");
    if (teamArg === "scrum") {
      await runScrum(taskArg);
    } else {
      await runTeam(teamArg, taskArg);
    }
  } else {
    console.log(`
Usage:
  node team.js <team> <task>       Run team pipeline (planning/specs)
  node team.js scrum <topic>       Cross-team standup
  node team.js --dry-run <...>     Estimate tokens only

Teams: ${Object.keys(TEAMS).join(", ") || "(none loaded — import TEAMS)"}

Each team has a Head who orchestrates sub-agents in a pipeline.
Teams auto-read other departments' latest reports as context.
Heads include a "Handoff to other departments" section in final reports.

team pipeline:

Scrum pairs:
  UX Researcher ↔ Frontend Dev    (interaction patterns, touch feasibility)
  Art & UI ↔ Frontend Dev         (visual specs, Tailwind, responsive)
  UX Researcher ↔ Database        (data model vs UX flow limits)
  Content Writer ↔ Backend Dev    (error messages, validation copy, empty states)
  Growth Lead ↔ Backend Dev       (analytics events, tracking, funnel data)
  Community Manager ↔ UX          (user feedback, complaints, feature priorities)

Examples:
  node team.js tech "Design the annotation system"
  node team.js marketing "Plan beta launch messaging"
  node team.js scrum "Align on annotation UX"
`);
  }
}

main().catch(console.error);