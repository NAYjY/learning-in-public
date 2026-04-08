import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.join(__dirname, "chatbot", "logs");
const CODE_DIR = path.join(__dirname, "chatbot", "code");
const CHAT_LOG_FILE = path.join(LOGS_DIR, `session-${new Date().toISOString().slice(0, 10)}.md`);

const KEY_FILE = path.join(__dirname, "..", "key.txt");
const apiKey = fs.readFileSync(KEY_FILE, "utf-8").trim();
const client = new Anthropic({ apiKey });

const MODEL = "claude-opus-4-5";
let sessionTokens = 0;

// ─── System prompt ───
const SYSTEM_PROMPT = `You are a helpful assistant — like Claude on claude.ai.
You have no external context or reports loaded. You work purely from the conversation.

Your strengths:
- Answering questions clearly and concisely
- Writing, reviewing, and debugging code
- Explaining concepts and reasoning through problems
- Drafting text, emails, docs, and structured content
- Giving honest, practical advice

When you write code, write complete, working code unless asked otherwise.
Be direct. Don't over-hedge. If you don't know something, say so.`;

// ─── LLM call with retry ───
async function chat(messages) {
  const countRes = await client.messages.countTokens({
    model: MODEL,
    system: SYSTEM_PROMPT,
    messages,
  });
  sessionTokens += countRes.input_tokens;
  console.log(`  [~${countRes.input_tokens} input tokens | session total: ~${sessionTokens}]\n`);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 8096,
        system: SYSTEM_PROMPT,
        messages,
        stream: false,
      });
      if (response?.content?.[0]?.text) {
        return response.content[0].text;
      }
      throw new Error("API response missing text content.");
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
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().slice(0, 19);
  fs.appendFileSync(CHAT_LOG_FILE, `\n**[${timestamp}] ${role}:**\n${text}\n`);
}

// ─── Save code file ───
function saveCodeFile(filename, content) {
  fs.mkdirSync(CODE_DIR, { recursive: true });
  const filePath = path.join(CODE_DIR, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

// ─── Supported text-based extensions ───
const TEXT_EXTENSIONS = new Set([
  "txt", "md", "js", "mjs", "cjs", "ts", "tsx", "jsx",
  "py", "rb", "php", "java", "c", "cpp", "h", "hpp",
  "cs", "go", "rs", "swift", "kt", "scala", "sh", "bash",
  "zsh", "fish", "html", "css", "scss", "sass", "less",
  "xml", "yaml", "yml", "toml", "ini", "env", "json",
  "sql", "graphql", "gql", "r", "lua", "vim", "conf", "log",
]);

function isSupportedTextFile(filePath) {
  const ext = path.extname(filePath).replace(".", "").toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

// ─── Detect file paths in a message and inject their contents ───
// Looks for patterns like: ./foo.js, ../bar.md, /abs/path.txt, or plain file.py
function injectFiles(message) {
  // Match file-path-like tokens: starts with ./ ../ / or is word.ext
  const filePattern = /(?:\.{1,2}\/|\/)?[\w\-./]+\.(?:txt|md|js|mjs|cjs|ts|tsx|jsx|py|rb|php|java|c|cpp|h|hpp|cs|go|rs|swift|kt|scala|sh|bash|zsh|fish|html|css|scss|sass|less|xml|yaml|yml|toml|ini|env|json|sql|graphql|gql|r|lua|vim|conf|log)\b/g;

  const matches = [...new Set(message.match(filePattern) || [])];
  if (matches.length === 0) return { message, injected: [] };

  const injected = [];
  let enriched = message;

  for (const rawPath of matches) {
    const resolved = path.resolve(process.cwd(), rawPath);
    if (!fs.existsSync(resolved)) continue;
    if (!isSupportedTextFile(resolved)) continue;

    try {
      const content = fs.readFileSync(resolved, "utf-8");
      const label = `\n\n--- FILE: ${rawPath} ---\n${content}\n--- END: ${rawPath} ---`;
      enriched += label;
      injected.push(rawPath);
    } catch {
      // skip unreadable files silently
    }
  }

  return { message: enriched, injected };
}

// ─── Extract code blocks from a reply ───
// Returns array of { lang, code }
function extractCodeBlocks(text) {
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  const blocks = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push({ lang: match[1] || "txt", code: match[2] });
  }
  return blocks;
}

// ─── Main interactive loop ───
async function main() {
  const history = []; // in-memory only, no persistence

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

  console.log(`
╔══════════════════════════════════════════════╗
║  Assistant — Interactive Chat                ║
╠══════════════════════════════════════════════╣
║  Mention any file path to load it inline:    ║
║    e.g. "review ./src/index.js"              ║
║    e.g. "what does ../config.yaml do?"       ║
║                                              ║
║  Commands:                                   ║
║  /code <filename>  Save last reply's code    ║
║  /reset            Clear conversation        ║
║  /log              Show chat log path        ║
║  /quit             Exit                      ║
╚══════════════════════════════════════════════╝
`);

  let lastReply = null;

  while (true) {
    const input = await ask("you > ");
    const trimmed = input.trim();
    if (!trimmed) continue;

    // ─── /quit ───
    if (trimmed === "/quit" || trimmed === "/exit") {
      console.log("bye.");
      break;
    }

    // ─── /reset ───
    if (trimmed === "/reset") {
      history.length = 0;
      lastReply = null;
      console.log("\n  Conversation cleared. Fresh start.\n");
      continue;
    }

    // ─── /log ───
    if (trimmed === "/log") {
      console.log(`\n  Chat log: ${CHAT_LOG_FILE}\n`);
      continue;
    }

    // ─── /code <filename> ───
    if (trimmed.startsWith("/code")) {
      if (!lastReply) {
        console.log("\n  No reply yet to extract code from.\n");
        continue;
      }
      const parts = trimmed.split(" ");
      const filename = parts[1] || null;
      const blocks = extractCodeBlocks(lastReply);

      if (blocks.length === 0) {
        console.log("\n  No code blocks found in the last reply.\n");
        continue;
      }

      if (filename) {
        // Save all blocks concatenated into one file
        const combined = blocks.map((b) => b.code).join("\n\n");
        const saved = saveCodeFile(filename, combined);
        console.log(`\n  ✓ Saved to ${saved}\n`);
      } else {
        // Auto-name each block by language
        blocks.forEach((b, i) => {
          const ext = b.lang === "javascript" || b.lang === "js" ? "js"
                    : b.lang === "typescript" || b.lang === "ts" ? "ts"
                    : b.lang === "python" || b.lang === "py" ? "py"
                    : b.lang === "html" ? "html"
                    : b.lang === "css" ? "css"
                    : b.lang === "json" ? "json"
                    : b.lang === "bash" || b.lang === "sh" ? "sh"
                    : b.lang || "txt";
          const name = `snippet-${Date.now()}-${i + 1}.${ext}`;
          const saved = saveCodeFile(name, b.code);
          console.log(`  ✓ ${saved}`);
        });
        console.log();
      }
      continue;
    }

    // ─── Regular chat ───
    const { message: enriched, injected } = injectFiles(trimmed);
    if (injected.length > 0) {
      console.log(`  [loaded file(s): ${injected.join(", ")}]\n`);
    }
    history.push({ role: "user", content: enriched });

    // Keep last 40 messages to stay sane
    while (history.length > 40) history.shift();

    process.stdout.write("assistant > ");
    const reply = await chat(history);
    lastReply = reply;
    history.push({ role: "assistant", content: reply });

    console.log(`${reply}\n`);

    appendChatLog("You", trimmed);
    appendChatLog("Assistant", reply);
  }

  rl.close();
}

main().catch(console.error);