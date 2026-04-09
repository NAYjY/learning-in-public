import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KEY_FILE = path.join(__dirname, "..", "key.txt");
const apiKey = fs.readFileSync(KEY_FILE, "utf-8").trim();
const client = new Anthropic({ apiKey });

const MODEL = "claude-sonnet-4-5";
const COST_PER_1K_INPUT = 0.003;
let totalTokens = 0;
let DRY_RUN = false;

const DEFAULT_MAX_TOKENS = 4096;

// ─── Git helpers (local only — no push) ───
function gitExec(cmd, opts = {}) {
  try {
    const out = execSync(cmd, { encoding: "utf-8", ...opts }).trim();
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: e.message };
  }
}

function gitCommit(files, message) {
  if (DRY_RUN) return; // never touch git during dry-run
  for (const f of files) {
    const r = gitExec(`git add "${f}"`);
    if (!r.ok) console.warn(`  [git] warn: could not stage ${f}`);
  }
  const r = gitExec(`git commit -m "${message}"`);
  if (r.ok) {
    console.log(`  [git] ✓ ${message}`);
  } else {
    console.warn(`  [git] warn: commit failed — ${r.out}`);
  }
}

// Returns the new branch name, or null on failure.
function gitCreateBranch(teamKey, taskSlug, timestamp) {
  const base = gitExec("git rev-parse --abbrev-ref HEAD");
  if (!base.ok) {
    console.error("  [git] ✗ Not a git repo or cannot read HEAD.");
    return null;
  }
  const branch = `build/${teamKey}/${taskSlug}-${timestamp}`;
  const r = gitExec(`git checkout -b "${branch}"`);
  if (!r.ok) {
    console.error(`  [git] ✗ Could not create branch: ${r.out}`);
    return null;
  }
  console.log(`  [git] ✓ New branch: ${branch}  (base: ${base.out})`);
  return branch;
}

// Slugify task string for use in a branch name
function slugify(text, maxLen = 40) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLen);
}

// ─── Token estimation ───
async function estimateTokens(systemPrompt, messages) {
  const response = await client.messages.countTokens({
    model: MODEL,
    system: systemPrompt,
    messages,
  });
  return response.input_tokens;
}

// ─── Truncate text to stay within token budget ───
function truncate(text, maxChars = 5000) {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n... [truncated — full output in build-report.md] ...";
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

// ─── LLM call with retry ───
async function chat(systemPrompt, messages, maxTokens = DEFAULT_MAX_TOKENS) {
  const tokens = await estimateTokens(systemPrompt, messages);
  totalTokens += tokens;

  if (DRY_RUN) {
    const sysP = systemPrompt.slice(0, 150).replace(/\n/g, " ") + (systemPrompt.length > 150 ? "…" : "");
    const last = messages[messages.length - 1];
    const msgP = String(last.content).slice(0, 200).replace(/\n/g, " ") + (String(last.content).length > 200 ? "…" : "");
    console.log(`  ┌ SYSTEM: ${sysP}`);
    console.log(`  │ ${last.role.toUpperCase()}: ${msgP}`);
    console.log(`  └ ~${tokens} tokens (max_output: ${maxTokens})\n`);
    return "[dry-run — skipped]";
  }
  console.log(`  [~${tokens} input tokens, max_output: ${maxTokens}]`);

  for (let attempt = 0; attempt < 7; attempt++) {
    await paceCall();
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      });
      return response.content[0].text;
    } catch (err) {
      if (err.status === 429 && attempt < 6) {
        const wait = (attempt + 1) * 20;
        console.log(`  [rate limited — waiting ${wait}s...]`);
        await new Promise((r) => setTimeout(r, wait * 1000));
        lastCallTime = Date.now();
      } else if (err.status === 413 && attempt < 6) {
        console.log(`  [token limit hit — truncating and retrying...]`);
        messages = messages.map((m) => ({
          ...m,
          content: truncate(m.content, Math.floor(String(m.content).length * 0.6)),
        }));
      } else {
        throw err;
      }
    }
  }
}

// ─── Dynamic team loader ───
// Each team lives in departments/<key>/team.json with this shape:
//
// {
//   "head": {
//     "name": "Alice (Head)",
//     "system": "You are Alice, the engineering lead..."
//   },
//   "pipeline": ["frontend", "backend", "qa"],
//   "agents": {
//     "frontend": { "name": "Bob (Frontend)", "system": "You are Bob...", "maxTokens": 4096 },
//     "backend":  { "name": "Carol (Backend)", "system": "You are Carol..." },
//     "qa":       { "name": "Dave (QA)", "system": "You are Dave..." }
//   }
// }
//
// To add a new team: create departments/<key>/team.json — no code changes needed.

function loadTeam(teamKey) {
  const configPath = path.join(__dirname, "departments", teamKey, "team.json");
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (e) {
    console.error(`Error parsing ${configPath}: ${e.message}`);
    return null;
  }
}

function listTeams() {
  const depDir = path.join(__dirname, "departments");
  if (!fs.existsSync(depDir)) return [];
  return fs.readdirSync(depDir).filter((name) => {
    const cfg = path.join(depDir, name, "team.json");
    return fs.existsSync(cfg);
  });
}

// ─── Read team meeting/planning reports for context ───
function getTeamReport(teamKey) {
  const candidates = [
    path.join(__dirname, "departments", teamKey, "team-report.md"),
    path.join(__dirname, "departments", teamKey, "report.md"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf-8");
  }
  return null;
}

// ─── Run a build pipeline ───
async function runBuild(teamKey, task) {
  const team = loadTeam(teamKey);
  if (!team) {
    console.error(`Unknown team: "${teamKey}" — no departments/${teamKey}/team.json found.`);
    const available = listTeams();
    if (available.length) console.log("Available teams:", available.join(", "));
    else console.log("No teams found. Create departments/<name>/team.json to add one.");
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const buildDir = path.join(__dirname, "departments", teamKey, "build-runs");
  fs.mkdirSync(buildDir, { recursive: true });
  const runDir = path.join(buildDir, timestamp);
  fs.mkdirSync(runDir, { recursive: true });

  // ── Git: create branch ONLY on real run ──
  let newBranch = null;
  if (!DRY_RUN) {
    const taskSlug = slugify(task);
    newBranch = gitCreateBranch(teamKey, taskSlug, timestamp);
    if (!newBranch) {
      console.error("Aborting: could not create git branch.");
      process.exit(1);
    }
  }

  // Load team report for context
  const meetingReport = getTeamReport(teamKey);
  const meetingContext = meetingReport
    ? `\n\nCONTEXT FROM TEAM REPORT (use this to inform your implementation):\n${truncate(meetingReport, 4000)}\n\n`
    : "";

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  🔨 ${team.head.name} — BUILD Pipeline`);
  console.log(`  Task: ${task}`);
  console.log(`  Team: ${teamKey} (${team.pipeline.length} agents)`);
  if (newBranch) console.log(`  Branch: ${newBranch}`);
  console.log(`${"=".repeat(60)}\n`);

  if (meetingReport) console.log(`📋 Loaded team report for context\n`);

  // ── Step 1: Head breaks down the task ──
  console.log(`[HEAD] Breaking down build task for team...\n`);
  const agentList = team.pipeline
    .map((k) => `- ${team.agents[k].name}: what should they build/implement?`)
    .join("\n");

  const breakdown = await chat(team.head.system, [
    {
      role: "user",
      content: `BUILD TASK for your team: ${task}
${meetingContext}
Break this into specific implementation tasks for each of your team members:
${agentList}

Be specific. Give each agent clear instructions on what code/artifacts to produce. Reference the team report if available.`,
    },
  ]);
  console.log(breakdown);

  const breakdownPath = path.join(runDir, "0-head-breakdown.md");
  fs.writeFileSync(breakdownPath, breakdown);
  gitCommit(
    [breakdownPath],
    `[build] ${teamKey}: head breakdown — ${slugify(task, 50)}`
  );

  // ── Step 2: Run pipeline — one commit per agent ──
  const outputs = {};

  for (const agentKey of team.pipeline) {
    const agent = team.agents[agentKey];
    const agentMaxTokens = agent.maxTokens || DEFAULT_MAX_TOKENS;
    console.log(`\n${"─".repeat(40)}`);
    console.log(`[${agent.name.toUpperCase()}] Building... (max ${agentMaxTokens} tokens)\n`);

    let previousContext = "";
    for (const [prevKey, prevOutput] of Object.entries(outputs)) {
      previousContext += `\n--- ${team.agents[prevKey].name} Output ---\n${truncate(prevOutput, 3000)}\n`;
    }

    const agentPrompt = previousContext
      ? `BUILD TASK from ${team.head.name}:\n${breakdown}\n\nPrevious team outputs:\n${previousContext}\n\nNow build your part. Output actual code and implementation artifacts.`
      : `BUILD TASK from ${team.head.name}:\n${breakdown}\n\nYou are first in the pipeline. Build your part. Output actual code and implementation artifacts.`;

    const output = await chat(agent.system, [{ role: "user", content: agentPrompt }], agentMaxTokens);

    console.log(output);
    outputs[agentKey] = output;

    const fileIndex = team.pipeline.indexOf(agentKey) + 1;
    const agentPath = path.join(runDir, `${fileIndex}-${agentKey}.md`);
    fs.writeFileSync(agentPath, output);
    gitCommit(
      [agentPath],
      `[build] ${teamKey}: ${agent.name} output — ${slugify(task, 40)}`
    );
  }

  // ── Step 3: Head consolidates ──
  console.log(`\n${"─".repeat(40)}`);
  console.log(`[HEAD] Reviewing build outputs and writing final report...\n`);

  let allOutputs = "";
  for (const [agentKey, output] of Object.entries(outputs)) {
    allOutputs += `\n## ${team.agents[agentKey].name} Output:\n${truncate(output, 2000)}\n\n---\n`;
  }

  const finalReport = await chat(team.head.system, [
    { role: "user", content: `BUILD TASK: ${task}` },
    { role: "assistant", content: breakdown },
    {
      role: "user",
      content: `Your team has completed their build work. Here are all outputs:\n${allOutputs}\n\nWrite the final build report:
1. Summary of what was built
2. Files created/modified by each agent
3. Any blocking issues found (security, review, QA)
4. Final verdict: ready to merge? or what needs follow-up?
5. Handoff notes for other teams`,
    },
  ]);
  console.log(finalReport);

  // ── Save & commit final report ──
  const reportContent = `# ${team.head.name} — Build Report

**Date:** ${new Date().toISOString()}
**Task:** ${task}
**Team:** ${teamKey}
**Branch:** ${newBranch ?? "(dry-run)"}
**Pipeline:** ${team.pipeline.map((k) => team.agents[k].name).join(" → ")}
**Mode:** BUILD (code implementation)

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

  const reportPath = path.join(runDir, "build-report.md");
  fs.writeFileSync(reportPath, reportContent);

  const latestPath = path.join(__dirname, "departments", teamKey, "build-report.md");
  fs.writeFileSync(latestPath, reportContent);

  gitCommit(
    [reportPath, latestPath],
    `[build] ${teamKey}: final report — ${slugify(task, 40)}`
  );

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ✓ Build report : departments/${teamKey}/build-report.md`);
  console.log(`  ✓ Run artifacts: departments/${teamKey}/build-runs/${timestamp}/`);
  if (newBranch) {
    console.log(`  ✓ Git branch   : ${newBranch}`);
    console.log(`  ✓ No push — all commits are local only`);
  }
  console.log(`${"=".repeat(60)}`);
  printTokenSummary();
}

function printTokenSummary() {
  const cost = ((totalTokens / 1000) * COST_PER_1K_INPUT).toFixed(4);
  console.log(`\nTotal input tokens: ~${totalTokens}`);
  console.log(`Estimated input cost: ~$${cost}`);
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

async function main() {
  if (!teamArg || !taskArg) {
    // Build team list dynamically from departments/*/team.json
    const available = listTeams();
    const teamLines = available.length
      ? available.map((key) => {
          const t = loadTeam(key);
          const pipeline = t?.pipeline?.map((k) => t.agents?.[k]?.name ?? k).join(" → ") ?? "?";
          const desc = t?.description ? `  ${t.description}` : "";
          return `  ${key.padEnd(12)}${desc}\n              Pipeline: ${pipeline}`;
        }).join("\n\n")
      : "  (none found — add departments/<name>/team.json to create one)";

    const exampleTeam = available[0] ?? "myteam";

    console.log(`
Usage:
  node team-build.js <team> "<task>"
  node team-build.js --dry-run <team> "<task>"

Teams (auto-detected from departments/*/team.json):

${teamLines}

Examples:
  node team-build.js ${exampleTeam} "Build the login flow with auth and tests"
  node team-build.js --dry-run ${exampleTeam} "Add dark mode support"

Add a team:
  Create departments/<name>/team.json — see README or existing teams for the schema.

Outputs:
  departments/<team>/build-report.md           ← latest build report
  departments/<team>/build-runs/<timestamp>/   ← every run archived
  git branch: build/<team>/<task-slug>-<ts>    ← local only, never pushed
`);
    process.exit(0);
  }

  // ── Phase 1: dry-run (no git, no API calls) ──
  DRY_RUN = true;
  console.log("\n🔍 DRY RUN — estimating prompts and tokens...\n");
  await runBuild(teamArg, taskArg);

  const dryTokens = totalTokens;
  const dryCost = ((dryTokens / 1000) * COST_PER_1K_INPUT).toFixed(4);
  console.log(`\n——— Dry run complete ———`);
  console.log(`Estimated input tokens : ~${dryTokens}`);
  console.log(`Estimated input cost   : ~$${dryCost}`);

  if (DRY_RUN_ONLY) process.exit(0);

  // ── Confirm before real run ──
  const go = await askConfirm("\nProceed with real build? [y/N] ");
  if (!go) { console.log("Aborted."); process.exit(0); }

  // ── Phase 2: real run (git branch + commits) ──
  DRY_RUN = false;
  totalTokens = 0;
  console.log("\n🔨 Running build pipeline...\n");
  await runBuild(teamArg, taskArg);
}

main().catch(console.error);