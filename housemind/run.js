import OpenAI from "openai";
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

const client = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_TOKEN,
});

const MAX_ROUNDS = 4;

async function chat(agentKey, history) {
  const agent = agents[agentKey];
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 400,
        messages: [
          { role: "system", content: agent.system },
          ...history,
        ],
      });
      return response.choices[0].message.content;
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
  const topic = process.argv[2] || "What should we build first — supplier onboarding or the owner visualization tool?";

  const pmSummary = await runMeeting(topic);

  console.log("\n--- Meeting complete ---");
  console.log(`\nMeeting log saved to: ${logFile}\n`);
}

main().catch(console.error);
