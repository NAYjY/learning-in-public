import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

import { TEAMS, BASE_CONTEXT } from "./subAgents.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KEY_FILE = path.join(__dirname, "..", "key.txt");
const apiKey = fs.readFileSync(KEY_FILE, "utf-8").trim();
const client = new Anthropic({ apiKey });

const MODEL = "claude-sonnet-4-5";
const OUTPUT_LIMIT = 200;
const FACILITATOR_LIMIT = 1200;
const HEAD_LIMIT = 400;
const AGENT_REPORT_LIMIT = 350;
const MAX_ROUNDS = 4;
const COST_PER_1K_INPUT = 0.003;

let totalInputTokens = 0;
let totalOutputTokens = 0;
let logPath = null;

// ─── Logging ───
function log(text) {
  if (logPath) fs.appendFileSync(logPath, text + "\n");
}

// ─── Auto-read context files ───
function readIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8").trim();
    return content.length > 0 ? content : null;
  }
  return null;
}

// Extract only PM Summary from board report — skip full debate transcript
function extractBoardSummary(boardReport) {
  if (!boardReport) return null;
  const markers = [
    /## PM Summary[\s\S]*$/i,
    /## WHAT WE AGREED[\s\S]*$/i,
    /# PM —[\s\S]*$/i,
  ];
  for (const marker of markers) {
    const match = boardReport.match(marker);
    if (match) return match[0].slice(0, 3000);
  }
  return boardReport.slice(-2000); // fallback: last 2000 chars
}

// ─── Rate limit pacer ───
const CALL_DELAY_MS = 12_000;
let lastCallTime = 0;
async function paceCall() {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (lastCallTime > 0 && elapsed < CALL_DELAY_MS) {
    const wait = CALL_DELAY_MS - elapsed;
    process.stdout.write(`  [pacing ${Math.ceil(wait / 1000)}s...]`);
    await new Promise((r) => setTimeout(r, wait));
    process.stdout.write("\r" + " ".repeat(30) + "\r");
  }
  lastCallTime = Date.now();
}

// ─── LLM call ───
async function chat(systemPrompt, messages, maxTokens = OUTPUT_LIMIT) {
  await paceCall();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages,
      });
      totalInputTokens += response.usage?.input_tokens ?? 0;
      totalOutputTokens += response.usage?.output_tokens ?? 0;
      console.log({
      cache_created: response.usage.cache_creation_input_tokens ?? 0,
      cache_read:    response.usage.cache_read_input_tokens ?? 0,
      });
      return response.content[0].text;
    } catch (err) {
      if (err.status === 429 && attempt < 4) {
        const wait = (attempt + 1) * 20;
        console.log(`  [rate limited — waiting ${wait}s...]`);
        await new Promise((r) => setTimeout(r, wait * 1000));
        lastCallTime = Date.now();
      } else {
        throw err;
      }
    }
  }
}

// ─── Safe JSON parse ───
function parseJSON(text, fallback) {
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    console.warn("  ⚠️  Facilitator returned invalid JSON — keeping previous state");
    return fallback;
  }
}

// ─── Facilitator system prompt ───
function getFacilitatorSystem() {
  return `You are the Meeting Facilitator for a team planning discussion.

Company context:
${BASE_CONTEXT}

You have three jobs. Read which job you are given and execute ONLY that one.

---

## JOB 1 — Build Initial Agenda
Input: task + board context + optional previous team report.
Output: initial state JSON.
- Pre-populate agreed[] with anything already decided by the board
- Pre-populate contested[] with key decisions this team must resolve
- Set narrative to what this meeting must resolve
- Pre-populate build_tasks with agent names as empty shells
Output ONLY valid JSON. No explanation. No markdown fences.

---

## JOB 2 — Update State After Round
Input: current state JSON + round responses.
Output: updated state JSON.
- Move contested → agreed only when agents explicitly agree
- Add new contested items that emerged
- Update positions under each contested item
- Add blockers with who waits on whom and urgency
- Add risks with owner + mitigation
- Append to key_moments: 1 sentence about what shifted this round
- Update narrative: max 3 sentences
- Update build_tasks as assignments become clear
Output ONLY valid JSON. No explanation. No markdown fences.

---

## JOB 3 — Write Agent Brief
Input: current state JSON + agent name.
Output: readable plain-text brief. Format exactly:

## What the board decided
[relevant board decisions for this agent]

## What we've agreed in this meeting
[list or "nothing yet"]

## Still being debated
[topic: positions so far, or "nothing yet"]

## Your blockers
[only blockers relevant to this agent, or "none"]

## Risks on your plate
[only risks owned by this agent, or "none"]

## Context
[narrative]

---

## State Schema — always maintain this exact structure:
{
  "agreed": ["string"],
  "contested": [
    {
      "topic": "string",
      "positions": { "AgentName": "their position" }
    }
  ],
  "commitments": { "AgentName": ["string"] },
  "blocked": [
    { "item": "string", "waiting_for": "string", "urgency": "CRITICAL|HIGH|MEDIUM" }
  ],
  "risks": [
    { "risk": "string", "owner": "string", "mitigation": "string" }
  ],
  "key_moments": ["string"],
  "narrative": "string",
  "open_questions": ["string"],
  "build_tasks": {
    "AgentName": {
      "owns": ["string"],
      "needs_from": { "OtherAgent": "what and when" },
      "delivers_to": { "OtherAgent": "what and when" },
      "effort": "string"
    }
  }
}`;
}

// ─── Agent system prompt ───
function getAgentSystem(agent) {
  return `${agent.system}

## Company Context
${BASE_CONTEXT}

## Meeting Rules
- Begin your response directly — never prefix with your name or role
- Keep responses under 5 sentences
- Lead with your position. Don't hedge
- If you disagree, say why specifically
- End with a question or challenge to keep discussion moving
- Flag dependencies with [BLOCKED: AgentName]
- Flag critical risks with [CRITICAL RISK]
- Flag founder decisions with [FOUNDER DECISION REQUIRED]`;
}

// ─── Facilitator calls ───
async function facilitatorInitial(task, boardSummary, previousReport) {
  const parts = [`JOB 1 — Build Initial Agenda\n\nTask: ${task}`];
  if (boardSummary) parts.push(`\n## Board Decisions:\n${boardSummary}`);
  if (previousReport) parts.push(`\n## Previous Team Report:\n${previousReport.slice(0, 2000)}`);
  parts.push(`\nBuild the initial debate state JSON.`);

  const reply = await chat(
    getFacilitatorSystem(),
    [{ role: "user", content: parts.join("\n") }],
    FACILITATOR_LIMIT
  );
  return parseJSON(reply, {
    agreed: [], contested: [], commitments: {}, blocked: [],
    risks: [], key_moments: [], narrative: "", open_questions: [], build_tasks: {}
  });
}

async function facilitatorUpdate(state, roundReplies) {
  const content = `JOB 2 — Update State After Round\n\nCurrent state:\n${JSON.stringify(state, null, 2)}\n\nRound responses:\n${roundReplies.map(r => `[${r.name}]: ${r.reply}`).join("\n\n")}\n\nUpdate the state JSON.`;
  const reply = await chat(getFacilitatorSystem(), [{ role: "user", content }], FACILITATOR_LIMIT);
  return parseJSON(reply, state);
}

async function facilitatorBrief(state, agentName) {
  const content = `JOB 3 — Write Agent Brief\n\nAgent: ${agentName}\n\nCurrent state:\n${JSON.stringify(state, null, 2)}`;
  return await chat(getFacilitatorSystem(), [{ role: "user", content }], FACILITATOR_LIMIT);
}

async function facilitatorAllBriefs(state, agentNames) {
  const content = `JOB 3 — Write briefs for ALL agents.
  
Agents: ${agentNames.join(", ")}

Current state:
${JSON.stringify(state, null, 2)}

Write one brief per agent separated by:
=== AgentName ===
`;
  return await chat(getFacilitatorSystem(), [{ role: "user", content }], FACILITATOR_LIMIT);
}

// ─── Round 0: self-selection ───
async function runSelfSelection(team, task, boardSummary) {
  console.log("\n--- Round 0: Self-selection ---");
  log(`## Round 0 — Self Selection\n`);

  const relevant = [];
  const context = boardSummary ? `\n\nBoard context:\n${boardSummary}` : "";

  for (const [agentKey, agent] of Object.entries(team.agents)) {
    const reply = await chat(getAgentSystem(agent), [{
      role: "user",
      content: `Task: "${task}"${context}\n\nIs this task relevant to your role? 1-2 sentences. If yes, state your primary concern. If not relevant, say exactly: "Not applicable."`,
    }], 80);

    console.log(`  [${agent.name}]: ${reply}`);
    log(`### ${agent.name}\n\n${reply}\n`);

    if (!reply.toLowerCase().includes("not applicable")) {
      relevant.push({ key: agentKey, agent });
      console.log(`  ✓ joins`);
    } else {
      console.log(`  — sits out`);
    }
  }

  console.log(`\n  In discussion: ${relevant.map(r => r.agent.name).join(", ")}\n`);
  log(`\n**In discussion:** ${relevant.map(r => r.agent.name).join(", ")}\n\n---\n`);
  return relevant;
}

// ─── Main ───
async function runTeamMeeting(teamKey) {
  const team = TEAMS[teamKey];
  if (!team) {
    console.error(`Unknown team: "${teamKey}". Available: ${Object.keys(TEAMS).join(", ")}`);
    process.exit(1);
  }

  // ── Auto-read all context — no prompting ──
  const boardReport    = readIfExists(path.join(__dirname, "board-report.md"));
  const boardSummary   = extractBoardSummary(boardReport);
  const previousReport = readIfExists(path.join(__dirname, "departments", teamKey, "team-report.md"));
  const codebaseCtx    = readIfExists(path.join(__dirname, "departments", teamKey, "codebase-context.md"));

  // Task extracted from board summary or fallback
  const task = boardSummary
    ? `Plan your team's work based on the board decisions above.`
    : `Plan your team's next sprint.`;

  // ── Setup output ──
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(__dirname, "departments", teamKey, "meetings");
  fs.mkdirSync(outDir, { recursive: true });
  logPath = path.join(outDir, `meeting-${timestamp}.md`);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  📋 ${team.head.name} — Team Discussion`);
  console.log(`  Team     : ${teamKey}`);
  console.log(`  Board    : ${boardSummary   ? "✓ loaded" : "✗ not found"}`);
  console.log(`  Previous : ${previousReport ? "✓ loaded" : "✗ none"}`);
  console.log(`  Codebase : ${codebaseCtx    ? "✓ loaded" : "✗ none"}`);
  console.log(`${"=".repeat(60)}\n`);

  log(`# Team Meeting — ${team.head.name}`);
  log(`\n**Date:** ${new Date().toISOString()}`);
  log(`\n**Team:** ${teamKey}\n`);
  if (boardSummary) log(`\n## Board Context\n\n${boardSummary}\n\n---\n`);

  // ── Head opens ──
  console.log("[HEAD] Opening meeting...\n");
  const headOpenParts = [
    `You are opening a team planning meeting.`,
    boardSummary  ? `\n## What the board decided:\n${boardSummary}` : "",
    codebaseCtx   ? `\n## Current codebase:\n${codebaseCtx}` : "",
    previousReport? `\n## What we planned before:\n${previousReport.slice(0, 1500)}` : "",
    `\nFrame what your team needs to plan and decide. What key questions must be resolved before anyone builds anything?`,
  ].filter(Boolean).join("\n");

  const headOpening = await chat(
    getAgentSystem(team.head),
    [{ role: "user", content: headOpenParts }],
    HEAD_LIMIT
  );
  console.log(`[${team.head.name}]:\n${headOpening}\n`);
  log(`## Head Opening\n\n${headOpening}\n\n---\n`);

  // ── Facilitator: initial agenda ──
  console.log("[FACILITATOR] Building initial agenda...\n");
  let state = await facilitatorInitial(task, boardSummary, previousReport);
  log(`## Initial Agenda State\n\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n\n---\n`);

  // ── Round 0: self-selection ──
  const relevantAgents = await runSelfSelection(team, task, boardSummary);
  if (relevantAgents.length === 0) {
    console.log("No agents relevant. Ending meeting.");
    return;
  }

  // // ── Debate rounds ──
  // for (let round = 1; round <= MAX_ROUNDS; round++) {
  //   console.log(`\n--- Round ${round} ---`);
  //   log(`## Round ${round}\n`);

  //   const roundReplies = [];

  //   for (const { agent } of relevantAgents) {
  //     const brief = await facilitatorBrief(state, agent.name);
  //     const reply = await chat(getAgentSystem(agent), [{
  //       role: "user",
  //       content: `${brief}\n\nGive your position for this round.`,
  //     }]);

  //     console.log(`\n[${agent.name}]:\n${reply}`);
  //     log(`### ${agent.name}\n\n${reply}\n`);
  //     roundReplies.push({ name: agent.name, reply });
  //   }

  //   console.log("\n[FACILITATOR] Updating state...");
  //   state = await facilitatorUpdate(state, roundReplies);
  //   log(`\n**State after round ${round}:**\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n\n---\n`);

  //   if (state.contested.length === 0 && state.blocked.length === 0) {
  //     console.log("\n✅ All items resolved — ending early.");
  //     log(`\n> ✅ Resolved after round ${round}.\n`);
  //     break;
  //   }
  // }
// ── Debate rounds ──
for (let round = 1; round <= MAX_ROUNDS; round++) {
  console.log(`\n--- Round ${round} ---`);
  log(`## Round ${round}\n`);

  // ✅ One call for all briefs at once
  console.log("[FACILITATOR] Writing briefs...");
  const agentNames = relevantAgents.map(r => r.agent.name);
  const allBriefs = await facilitatorAllBriefs(state, agentNames);

  const roundReplies = [];

  for (const { agent } of relevantAgents) {
    // Parse this agent's section from the bulk brief
    const briefMatch = allBriefs.match(
      new RegExp(`=== ${agent.name} ===([\\s\\S]*?)(?==== |$)`)
    );
    const brief = briefMatch ? briefMatch[1].trim() : allBriefs;

    const reply = await chat(getAgentSystem(agent), [{
      role: "user",
      content: `${brief}\n\nGive your position for this round.`,
    }]);

    console.log(`\n[${agent.name}]:\n${reply}`);
    log(`### ${agent.name}\n\n${reply}\n`);
    roundReplies.push({ name: agent.name, reply });
  }

  console.log("\n[FACILITATOR] Updating state...");
  state = await facilitatorUpdate(state, roundReplies);
  log(`\n**State after round ${round}:**\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n\n---\n`);

  if (state.contested.length === 0 && state.blocked.length === 0) {
    console.log("\n✅ All items resolved — ending early.");
    log(`\n> ✅ Resolved after round ${round}.\n`);
    break;
  }
}
  // ── Head locks approach ──
  console.log("\n[HEAD] Locking final approach...\n");
  const lockedApproach = await chat(getAgentSystem(team.head), [{
    role: "user",
    content: `Final debate state:\n${JSON.stringify(state, null, 2)}\n\nLock the final approach. Be decisive. State clearly what each agent builds, in what order, with what dependencies.`,
  }], HEAD_LIMIT);
  console.log(`[${team.head.name}]:\n${lockedApproach}\n`);
  log(`## Head — Locked Approach\n\n${lockedApproach}\n\n---\n`);

  // ── Individual agent reports ──
  console.log("\n--- Individual agent reports ---\n");
  log(`## Individual Agent Reports\n`);

  const agentReports = {};
  for (const { key, agent } of relevantAgents) {
    const report = await chat(getAgentSystem(agent), [{
      role: "user",
      content: `Final state:\n${JSON.stringify(state, null, 2)}\n\nLocked approach:\n${lockedApproach}\n\nWrite YOUR build report:\n1. What you own\n2. Specific deliverables (be concrete — filenames, endpoints, schemas)\n3. What you need from others before you start\n4. What others need from you and when\n5. Remaining risks\n6. Estimated effort`,
    }], AGENT_REPORT_LIMIT);

    agentReports[key] = report;
    console.log(`  ✓ ${agent.name}`);
    log(`### ${agent.name}\n\n${report}\n`);
  }

  // ── Team summary ──
  console.log("\n[HEAD] Writing team summary...\n");
  const allReports = Object.entries(agentReports)
    .map(([k, r]) => `### ${team.agents[k].name}\n${r}`)
    .join("\n\n---\n\n");

  const teamSummary = await chat(getAgentSystem(team.head), [{
    role: "user",
    content: `Final state:\n${JSON.stringify(state, null, 2)}\n\nLocked approach:\n${lockedApproach}\n\nAgent reports:\n${allReports}\n\nWrite the team summary:\n1. Architecture/approach decisions made\n2. Who owns what (clear assignments)\n3. Build order — who goes first, what unblocks who\n4. Unresolved risks\n5. What the build session must know\n6. Handoff notes for other teams`,
  }], HEAD_LIMIT);
  console.log(`[${team.head.name}]:\n${teamSummary}`);
  log(`\n---\n\n## Team Summary\n\n${teamSummary}\n`);

  // ── Save team-report.md (read by build session) ──
  const teamReport = `# Team Report — ${team.head.name}

**Date:** ${new Date().toISOString()}
**Team:** ${teamKey}

---

## Board Context
${boardSummary ?? "_No board report found_"}

---

## Final Debate State
\`\`\`json
${JSON.stringify(state, null, 2)}
\`\`\`

---

## Locked Approach
${lockedApproach}

---

## Individual Agent Reports

${allReports}

---

## Team Summary
${teamSummary}
`;

  const latestPath = path.join(__dirname, "departments", teamKey, "team-report.md");
  fs.writeFileSync(latestPath, teamReport);

  // ── Cost ──
  const cost = ((totalInputTokens / 1000) * COST_PER_1K_INPUT).toFixed(4);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ✓ Meeting log  : departments/${teamKey}/meetings/meeting-${timestamp}.md`);
  console.log(`  ✓ Team report  : departments/${teamKey}/team-report.md  ← build session reads this`);
  console.log(`  ─`);
  console.log(`  Input  : ${totalInputTokens.toLocaleString()} tokens`);
  console.log(`  Output : ${totalOutputTokens.toLocaleString()} tokens`);
  console.log(`  Cost   : ~$${cost}`);
  console.log(`${"=".repeat(60)}\n`);
}

// ─── CLI ───
const args = process.argv.slice(2);
const teamArg = args[0];

if (!teamArg) {
  const available = Object.entries(TEAMS).map(([key, t]) => {
    const agents = Object.values(t.agents).map(a => a.name).join(", ");
    return `  ${key.padEnd(14)}Head: ${t.head.name}\n${" ".repeat(16)}Agents: ${agents}`;
  }).join("\n\n");

  console.log(`
Usage:
  node team.js <team>

No task argument needed — task is derived from board-report.md automatically.

Teams:
${available}

Auto-read inputs (zero prompting):
  board-report.md                              ← board decisions (PM summary extracted)
  departments/<team>/team-report.md            ← previous plan (optional)
  departments/<team>/codebase-context.md       ← codebase state (optional)

Outputs:
  departments/<team>/meetings/meeting-<ts>.md  ← full debate log (archive)
  departments/<team>/team-report.md            ← summary only, read by build session

Full bash pipeline:
  node board.js "Should we expand to new market?"   # board decides
  node team.js tech                                  # tech plans
  node team.js operations                            # ops plans
  node team.js marketing                             # marketing plans
  node build.js tech                                 # tech builds
`);
  process.exit(0);
}

if (!TEAMS[teamArg]) {
  console.error(`Unknown team: "${teamArg}". Available: ${Object.keys(TEAMS).join(", ")}`);
  process.exit(1);
}

runTeamMeeting(teamArg).catch(console.error);