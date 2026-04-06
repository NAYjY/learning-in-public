import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PM_DIR = path.join(__dirname, "departments", "pm");
const TICKETS_FILE = path.join(PM_DIR, "tickets.json");
const CHAT_LOG_FILE = path.join(PM_DIR, "chat-log.md");
const HISTORY_FILE = path.join(PM_DIR, "history.json");

const client = new Anthropic();

// ─── Ticket board (persists to disk) ───
function loadTickets() {
  if (fs.existsSync(TICKETS_FILE)) {
    return JSON.parse(fs.readFileSync(TICKETS_FILE, "utf-8"));
  }
  return [];
}

function saveTickets(tickets) {
  fs.mkdirSync(path.dirname(TICKETS_FILE), { recursive: true });
  fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
}

function formatTickets(tickets) {
  if (tickets.length === 0) return "  (no tickets)";
  return tickets
    .map((t) => {
      const status = t.status === "done" ? "✓" : t.status === "in-progress" ? "▶" : "○";
      return `  ${status} #${t.id} [${t.status}] ${t.title}`;
    })
    .join("\n");
}

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
  return parts.join("\n\n---\n\n");
}

function buildSystemPrompt(tickets) {
  const ctx = loadContext();
  const ticketBoard = tickets.length > 0
    ? `\n\nCurrent ticket board:\n${formatTickets(tickets)}`
    : "\n\nTicket board is empty.";

  return `You are the PM for HouseMind — a platform connecting architects, contractors, homeowners, and suppliers for building product decisions.

You have full context from all department reports below. You remember the conversation history within this session.

Your job:
- Answer questions about the project status, priorities, tradeoffs
- When the founder assigns a ticket, acknowledge it and suggest how to approach it
- When asked about priorities, reference the actual department reports
- Be concise, decisive, and practical. You are a cofounder-level PM.
- If you don't know something, say so — don't make things up

${ticketBoard}

--- DEPARTMENT CONTEXT ---
${ctx}`;
}

// ─── LLM call with retry ───
async function chat(systemPrompt, messages) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: systemPrompt,
        messages: messages,
      });
      return response.content[0].text;
    } catch (err) {
      if ((err.status === 429 || err.status === 413) && attempt < 4) {
        const wait = (attempt + 1) * 15;
        process.stdout.write(`  [${err.status === 413 ? "too large" : "rate limited"} — waiting ${wait}s...]\n`);
        await new Promise((r) => setTimeout(r, wait * 1000));
      } else {
        throw err;
      }
    }
  }
}

// ─── Chat log ───
function appendChatLog(role, text) {
  fs.mkdirSync(path.dirname(CHAT_LOG_FILE), { recursive: true });
  const timestamp = new Date().toISOString().slice(0, 19);
  fs.appendFileSync(CHAT_LOG_FILE, `\n**[${timestamp}] ${role}:** ${text}\n`);
}

// ─── Persistent conversation history ───
function loadHistory() {
  if (fs.existsSync(HISTORY_FILE)) {
    const all = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
    // Keep last 30 messages to stay under token limits
    return all.slice(-30);
  }
  return [];
}

function saveHistory(history) {
  fs.mkdirSync(PM_DIR, { recursive: true });
  // Keep last 50 on disk
  const toSave = history.slice(-50);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(toSave, null, 2));
}

// ─── Main interactive loop ───
async function main() {
  const tickets = loadTickets();
  const history = loadHistory();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

  console.log(`
╔══════════════════════════════════════════════╗
║  HouseMind PM — Interactive Chat             ║
╠══════════════════════════════════════════════╣
║  Chat naturally or use commands:             ║
║                                              ║
║  /ticket add <title>   Add a new ticket      ║
║  /ticket list          Show all tickets       ║
║  /ticket start <id>    Mark in-progress       ║
║  /ticket done <id>     Mark completed         ║
║  /ticket drop <id>     Remove a ticket        ║
║  /ticket clear         Clear done tickets     ║
║  /reset                Clear conversation      ║
║  /log                  Show chat log path      ║
║  /quit                 Exit                   ║
╚══════════════════════════════════════════════╝
`);

  console.log(`Loaded ${tickets.length} ticket(s), ${history.length} past message(s). Type a message to chat with PM.\n`);

  while (true) {
    const input = await ask("you > ");
    const trimmed = input.trim();

    if (!trimmed) continue;

    // ─── Commands ───
    if (trimmed === "/quit" || trimmed === "/exit") {
      console.log("bye.");
      break;
    }

    if (trimmed === "/ticket list" || trimmed === "/tickets") {
      console.log(`\n📋 Tickets:\n${formatTickets(tickets)}\n`);
      continue;
    }

    if (trimmed.startsWith("/ticket add ")) {
      const title = trimmed.slice("/ticket add ".length).trim();
      const id = tickets.length > 0 ? Math.max(...tickets.map((t) => t.id)) + 1 : 1;
      tickets.push({ id, title, status: "open", created: new Date().toISOString() });
      saveTickets(tickets);
      console.log(`\n  ○ #${id} added: ${title}\n`);
      // Tell PM about it
      history.push({ role: "user", content: `I just added ticket #${id}: "${title}"` });
      const reply = await chat(buildSystemPrompt(tickets), history);
      history.push({ role: "assistant", content: reply });
      saveHistory(history);
      console.log(`PM > ${reply}\n`);
      appendChatLog("You", `[ticket add] ${title}`);
      appendChatLog("PM", reply);
      continue;
    }

    if (trimmed.startsWith("/ticket start ")) {
      const id = parseInt(trimmed.split(" ").pop());
      const ticket = tickets.find((t) => t.id === id);
      if (ticket) {
        ticket.status = "in-progress";
        saveTickets(tickets);
        console.log(`\n  ▶ #${id} in-progress: ${ticket.title}\n`);
      } else {
        console.log(`  ticket #${id} not found\n`);
      }
      continue;
    }

    if (trimmed.startsWith("/ticket done ")) {
      const id = parseInt(trimmed.split(" ").pop());
      const ticket = tickets.find((t) => t.id === id);
      if (ticket) {
        ticket.status = "done";
        saveTickets(tickets);
        console.log(`\n  ✓ #${id} done: ${ticket.title}\n`);
      } else {
        console.log(`  ticket #${id} not found\n`);
      }
      continue;
    }

    if (trimmed.startsWith("/ticket drop ")) {
      const id = parseInt(trimmed.split(" ").pop());
      const idx = tickets.findIndex((t) => t.id === id);
      if (idx !== -1) {
        const removed = tickets.splice(idx, 1)[0];
        saveTickets(tickets);
        console.log(`\n  ✗ #${id} dropped: ${removed.title}\n`);
      } else {
        console.log(`  ticket #${id} not found\n`);
      }
      continue;
    }

    if (trimmed === "/ticket clear") {
      const before = tickets.length;
      const remaining = tickets.filter((t) => t.status !== "done");
      tickets.length = 0;
      tickets.push(...remaining);
      saveTickets(tickets);
      console.log(`\n  cleared ${before - remaining.length} done ticket(s). ${remaining.length} remaining.\n`);
      continue;
    }

    if (trimmed === "/log") {
      console.log(`\n  Chat log: ${CHAT_LOG_FILE}\n`);
      continue;
    }

    if (trimmed === "/reset") {
      history.length = 0;
      saveHistory(history);
      console.log("\n  Conversation memory cleared. PM still has department reports + tickets.\n");
      continue;
    }

    // ─── Regular chat ───
    history.push({ role: "user", content: trimmed });

    // Keep history manageable (last 20 messages)
    while (history.length > 20) history.shift();

    process.stdout.write("PM > ");
    const reply = await chat(buildSystemPrompt(tickets), history);
    history.push({ role: "assistant", content: reply });
    saveHistory(history);
    console.log(`${reply}\n`);

    appendChatLog("You", trimmed);
    appendChatLog("PM", reply);
  }

  rl.close();
}

main().catch(console.error);
