import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ─── Import team config ───
// expects: export const TEAMS = { tech: {...}, marketing: {...}, operations: {...} }
// expects: export const BASE_CONTEXT = "..."
import { TEAMS, BASE_CONTEXT } from "./subAgentCompact.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KEY_FILE = path.join(__dirname, "..", "key.txt");
const apiKey = fs.readFileSync(KEY_FILE, "utf-8").trim();
const client = new Anthropic({ apiKey });

const MODEL = "claude-sonnet-4-5";
const OUTPUT_LIMIT = 200;         // discussion responses — short and sharp
const FACILITATOR_LIMIT = 400;   // facilitator needs more room for JSON + brief
const MAX_ROUNDS = 4;
const COST_PER_1K_INPUT = 0.003;

let totalInputTokens = 0;
let totalOutputTokens = 0;

// ─── Logging ───
let logPath = null;
function log(text) {
  if (logPath) fs.appendFileSync(logPath, text + "\n");
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
      const input = response.usage?.input_tokens ?? 0;
      const output = response.usage?.output_tokens ?? 0;
      totalInputTokens += input;
      totalOutputTokens += output;
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

// ─── Built-in Facilitator system prompt ───
function getFacilitatorSystem() {
  return `You are the Meeting Facilitator for ${BASE_CONTEXT}

You have three jobs. Read which job you are given and execute only that one.

## JOB 1 — Build Initial Agenda
Input: task description, no round responses yet.
Output: initial state JSON with contested[] pre-populated from the task.
No explanation. No markdown fences. Output ONLY valid JSON.

## JOB 2 — Update State After Round
Input: current state JSON + round responses from agents.
Output: updated state JSON. 
Rules:
- Move contested → agreed only when agents explicitly agree
- Add new contested items that emerged
- Update positions under each contested item
- Add blockers with who waits on whom
- Add risks with owner + mitigation
- Update key_moments with 1-2 sentences about what shifted this round
- Update narrative (max 3 sentences — the spirit of the debate so far)
No explanation. No markdown fences. Output ONLY valid JSON.

## JOB 3 — Write Agent Brief
Input: current state JSON + which agent to brief.
Output: readable plain-text brief for that agent. Format:

## What we've agreed
[list]

## Still being debated
[topic — positions so far]

## You are blocked on
[only blockers relevant to this agent, or "none"]

## Risks on your plate
[only risks owned by this agent, or "none"]

## Context
[narrative]

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
  "open_questions": ["string"]
}`;
}

// ─── Agent system prompt wrapper ───
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

// ─── Facilitator: build initial agenda ───
async function facilitatorInitial(task) {
  const messages = [{
    role: "user",
    content: `JOB 1 — Build Initial Agenda\n\nTask: ${task}\n\nBuild the initial debate state JSON based on this task and company context. Pre-populate contested[] with the key technical/operational decisions this task requires.`,
  }];
  const reply = await chat(getFacilitatorSystem(), messages, FACILITATOR_LIMIT);
  return parseJSON(reply, { agreed: [], contested: [], commitments: {}, blocked: [], risks: [], key_moments: [], narrative: "", open_questions: [] });
}

// ─── Facilitator: update state after round ───
async function facilitatorUpdate(state, roundReplies) {
  const messages = [{
    role: "user",
    content: `JOB 2 — Update State After Round\n\nCurrent state:\n${JSON.stringify(state, null, 2)}\n\nRound responses:\n${roundReplies.map(r => `[${r.name}]: ${r.reply}`).join("\n\n")}\n\nUpdate the state JSON.`,
  }];
  const reply = await chat(getFacilitatorSystem(), messages, FACILITATOR_LIMIT);
  return parseJSON(reply, state);
}

// ─── Facilitator: write agent brief ───
async function facilitatorBrief(state, agentName) {
  const messages = [{
    role: "user",
    content: `JOB 3 — Write Agent Brief\n\nAgent to brief: ${agentName}\n\nCurrent state:\n${JSON.stringify(state, null, 2)}\n\nWrite a readable brief for this agent only.`,
  }];
  return await chat(getFacilitatorSystem(), messages, FACILITATOR_LIMIT);
}

// ─── Safe JSON parse ───
function parseJSON(text, fallback) {
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    console.warn("  ⚠️  Facilitator returned invalid JSON — keeping previous state");
    return fallback;
  }
}

// ─── Round 0: self-selection ───
async function runSelfSelection(team, task) {
  console.log("\n--- Round 0: Self-selection ---");
  log(`## Round 0 — Self Selection\n`);

  const relevant = [];

  for (const [agentKey, agent] of Object.entries(team.agents)) {
    const messages = [{
      role: "user",
      content: `Task under discussion: "${task}"\n\nIs this task relevant to your role? Answer in 1-2 sentences. If yes, briefly state your primary concern or contribution. If not relevant, say "Not applicable."`,
    }];

    const reply = await chat(getAgentSystem(agent), messages, 80);
    console.log(`  [${agent.name}]: ${reply}`);
    log(`### ${agent.name}\n\n${reply}\n`);

    const notApplicable = reply.toLowerCase().includes("not applicable");
    if (!notApplicable) {
      relevant.push({ key: agentKey, agent });
      console.log(`  ✓ ${agent.name} joins discussion`);
    } else {
      console.log(`  — ${agent.name} sits out`);
    }
  }

  console.log(`\n  Relevant agents: ${relevant.map(r => r.agent.name).join(", ")}\n`);
  log(`\n**Relevant agents:** ${relevant.map(r => r.agent.name).join(", ")}\n\n---\n`);
  return relevant;
}

// ─── Main meeting runner ───
async function runTeamMeeting(teamKey, task) {
  const team = TEAMS[teamKey];
  if (!team) {
    console.error(`Unknown team: "${teamKey}". Available: ${Object.keys(TEAMS).join(", ")}`);
    process.exit(1);
  }

  // ── Setup output directory ──
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(__dirname, "departments", teamKey, "meetings");
  fs.mkdirSync(outDir, { recursive: true });
  logPath = path.join(outDir, `meeting-${timestamp}.md`);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  📋 ${team.head.name} — Team Discussion`);
  console.log(`  Task: ${task}`);
  console.log(`  Team: ${teamKey}`);
  console.log(`${"=".repeat(60)}\n`);

  log(`# Team Meeting — ${team.head.name}`);
  log(`\n**Date:** ${new Date().toISOString()}`);
  log(`\n**Team:** ${teamKey}`);
  log(`\n**Task:** ${task}\n\n---\n`);

  // ── Head opens ──
  console.log("[HEAD] Opening meeting...\n");
  const headOpening = await chat(getAgentSystem(team.head), [{
    role: "user",
    content: `Open the team discussion for this task: "${task}"\n\nBriefly frame what needs to be decided. What are the key architectural or operational questions the team must resolve before anyone builds anything?`,
  }], 250);

  console.log(`[${team.head.name}]: ${headOpening}\n`);
  log(`## Head Opening\n\n${headOpening}\n\n---\n`);

  // ── Facilitator builds initial agenda ──
  console.log("[FACILITATOR] Building initial agenda...\n");
  let state = await facilitatorInitial(task);
  log(`## Initial Agenda State\n\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n\n---\n`);

  // ── Round 0: self-selection ──
  const relevantAgents = await runSelfSelection(team, task);

  if (relevantAgents.length === 0) {
    console.log("No agents selected as relevant. Ending meeting.");
    return;
  }

  // ── Debate rounds ──
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    console.log(`\n--- Round ${round} ---`);
    log(`## Round ${round}\n`);

    const roundReplies = [];

    for (const { agent } of relevantAgents) {
      // Facilitator writes a brief for this agent
      const brief = await facilitatorBrief(state, agent.name);

      const messages = [{
        role: "user",
        content: `${brief}\n\nTask: ${task}\n\nGive your position for this round.`,
      }];

      const reply = await chat(getAgentSystem(agent), messages);
      console.log(`\n[${agent.name}]:\n${reply}`);
      log(`### ${agent.name}\n\n${reply}\n`);

      roundReplies.push({ name: agent.name, reply });
    }

    // Facilitator updates state
    console.log("\n[FACILITATOR] Updating state...");
    state = await facilitatorUpdate(state, roundReplies);
    log(`\n**State after round ${round}:**\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n\n---\n`);

    // Early exit if nothing contested and no blockers
    if (state.contested.length === 0 && state.blocked.length === 0) {
      console.log("\n✅ All items resolved — ending debate early.");
      log(`\n> ✅ All items resolved after round ${round}.\n`);
      break;
    }
  }

  // ── Head locks final approach ──
  console.log("\n[HEAD] Locking final approach...\n");
  const lockMessages = [{
    role: "user",
    content: `Task: ${task}\n\nFinal debate state:\n${JSON.stringify(state, null, 2)}\n\nLock the final approach. Resolve any remaining contested items. Be decisive. What does each agent build, in what order, with what dependencies?`,
  }];
  const lockedApproach = await chat(getAgentSystem(team.head), lockMessages, 400);
  console.log(`[${team.head.name}]:\n${lockedApproach}\n`);
  log(`## Head — Locked Approach\n\n${lockedApproach}\n\n---\n`);

  // ── Individual agent reports ──
  console.log("\n--- Writing individual agent reports ---\n");
  log(`## Individual Agent Reports\n`);

  const agentReports = {};

  for (const { key, agent } of relevantAgents) {
    const messages = [{
      role: "user",
      content: `Task: ${task}\n\nFinal state:\n${JSON.stringify(state, null, 2)}\n\nLocked approach from Head:\n${lockedApproach}\n\nWrite YOUR individual work report. Include:\n1. What you own in this task\n2. Your specific deliverables\n3. Dependencies — what you need from others before you can start\n4. What others need from you, and when\n5. Risks or concerns you still have\n6. Your estimated effort`,
    }];

    const report = await chat(getAgentSystem(agent), messages, 350);
    agentReports[key] = report;
    console.log(`[${agent.name}] report written`);
    log(`### ${agent.name}\n\n${report}\n`);
  }

  // ── Team summary report ──
  console.log("\n[HEAD] Writing team summary report...\n");

  const allAgentReports = Object.entries(agentReports)
    .map(([k, r]) => `## ${team.agents[k].name}\n${r}`)
    .join("\n\n---\n\n");

  const summaryMessages = [{
    role: "user",
    content: `Task: ${task}\n\nFinal debate state:\n${JSON.stringify(state, null, 2)}\n\nLocked approach:\n${lockedApproach}\n\nIndividual agent reports:\n${allAgentReports}\n\nWrite the team summary report:\n1. What was decided (architecture, approach, scope)\n2. Who owns what (clear assignments)\n3. Dependency map (who waits on whom)\n4. Unresolved items or risks\n5. What the build session needs to know\n6. Handoff notes for other teams`,
  }];

  const teamSummary = await chat(getAgentSystem(team.head), summaryMessages, 500);
  console.log(`[${team.head.name}]:\n${teamSummary}`);

  // ── Save summary report ──
  const summaryReport = `# Team Meeting Summary — ${team.head.name}

**Date:** ${new Date().toISOString()}
**Task:** ${task}
**Team:** ${teamKey}

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

${allAgentReports}

---

## Team Summary
${teamSummary}
`;

  const summaryPath = path.join(outDir, `summary-${timestamp}.md`);
  fs.writeFileSync(summaryPath, summaryReport);

  // Also write as latest for build session to read
  const latestPath = path.join(__dirname, "departments", teamKey, "team-report.md");
  fs.writeFileSync(latestPath, summaryReport);

  log(`\n---\n\n## Team Summary\n\n${teamSummary}\n`);

  // ── Cost summary ──
  const inputCost = ((totalInputTokens / 1000) * COST_PER_1K_INPUT).toFixed(4);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ✓ Meeting log    : departments/${teamKey}/meetings/meeting-${timestamp}.md`);
  console.log(`  ✓ Summary report : departments/${teamKey}/meetings/summary-${timestamp}.md`);
  console.log(`  ✓ Latest report  : departments/${teamKey}/team-report.md`);
  console.log(`  ─`);
  console.log(`  Input tokens  : ${totalInputTokens.toLocaleString()}`);
  console.log(`  Output tokens : ${totalOutputTokens.toLocaleString()}`);
  console.log(`  Est. cost     : ~$${inputCost}`);
  console.log(`${"=".repeat(60)}\n`);
}

// ─── CLI ───
const args = process.argv.slice(2);
const teamArg = args[0];
const taskArg = args.slice(1).join(" ");

if (!teamArg || !taskArg) {
  const available = Object.entries(TEAMS).map(([key, t]) => {
    const agents = Object.values(t.agents).map(a => a.name).join(", ");
    return `  ${key.padEnd(14)}Head: ${t.head.name}\n                Agents: ${agents}`;
  }).join("\n\n");

  console.log(`
Usage:
  node team.js <team> "<task>"

Teams:

${available}

Examples:
  node team.js tech "Design annotation workspace architecture"
  node team.js marketing "Plan beta launch for first 5 architects"
  node team.js operations "Define product curation workflow"

Outputs:
  departments/<team>/meetings/meeting-<ts>.md    ← full meeting log
  departments/<team>/meetings/summary-<ts>.md   ← summary + agent reports
  departments/<team>/team-report.md             ← latest (read by build session)
`);
  process.exit(0);
}

if (!TEAMS[teamArg]) {
  console.error(`Unknown team: "${teamArg}". Available: ${Object.keys(TEAMS).join(", ")}`);
  process.exit(1);
}

runTeamMeeting(teamArg, taskArg).catch(console.error);