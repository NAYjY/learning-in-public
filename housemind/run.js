import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { agents } from "./agents.js";

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
const DRY_RUN = args.includes("--dry-run");
let totalTokens = 0;

const MODEL = "claude-sonnet-4-6";
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
  console.log(`  [${agent.name}: ~${tokens} input tokens]`);

  if (DRY_RUN) {
    return "[dry-run — skipped]";
  }

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
  let round = 0;

  console.log("\n--- Meeting started ---");
  console.log(`Topic: ${topic}\n`);
  log(`# Meeting Log\n`);
  log(`**Date:** ${new Date().toISOString()}\n`);
  log(`**Topic:** ${topic}\n`);
  log(`---\n`);

  const opening = `We need to discuss: ${topic}. Marketing, what's your take?`;
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

async function main() {
  const topic = args.filter((a) => a !== "--dry-run")[0] || "What should we build first — supplier onboarding or the owner visualization tool?";

  if (DRY_RUN) {
    console.log("\n🔍 DRY RUN — estimating tokens without API calls\n");
  }

  const pmSummary = await runMeeting(topic);

  const cost = ((totalTokens / 1000) * COST_PER_1K_INPUT).toFixed(4);
  console.log(`\n--- ${DRY_RUN ? "Dry run" : "Meeting"} complete ---`);
  console.log(`Total input tokens: ~${totalTokens}`);
  console.log(`Estimated input cost: ~$${cost}`);
  if (!DRY_RUN) {
    console.log(`\nMeeting log saved to: ${logFile}\n`);
  }
}

main().catch(console.error);
