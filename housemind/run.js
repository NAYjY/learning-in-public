import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";
import { agents } from "./agents.js";

const client = new Anthropic();

const MAX_ROUNDS = 4;

async function chat(agentKey, history) {
  const agent = agents[agentKey];
  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 400,
    system: agent.system,
    messages: history,
  });
  return response.content[0].text;
}

function formatMessage(speaker, text) {
  console.log(`\n[${speaker}]\n${text}\n`);
}

async function runMeeting(topic) {
  const history = [];
  let round = 0;

  console.log("\n--- Meeting started ---");
  console.log(`Topic: ${topic}\n`);

  const opening = `We need to discuss: ${topic}. Marketing, what's your take?`;
  history.push({ role: "user", content: opening });

  while (round < MAX_ROUNDS) {
    round++;

    for (const role of ["marketing", "operations", "tech"]) {
      const reply = await chat(role, history);
      formatMessage(agents[role].name, reply);
      history.push({ role: "assistant", content: `[${agents[role].name}]: ${reply}` });
      history.push({ role: "user", content: "Continue the discussion." });
    }
  }

  console.log("\n--- PM steps in ---");
  const pmReply = await chat("manager", history);
  formatMessage(agents.manager.name, pmReply);

  return pmReply;
}

async function askFounder(pmQuestion) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question("\nYour answer: ", (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const topic = process.argv[2] || "What should we build first — supplier onboarding or the owner visualization tool?";

  const pmSummary = await runMeeting(topic);
  const founderAnswer = await askFounder(pmSummary);

  console.log("\n--- Founder direction logged ---");
  console.log(founderAnswer);
  console.log("\nNext: feed this back into the next meeting round.\n");
}

main().catch(console.error);
