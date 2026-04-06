import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEY_FILE = path.join(__dirname, "..", "key.txt");
const apiKey = fs.readFileSync(KEY_FILE, "utf-8").trim();
const client = new Anthropic({ apiKey });

const MODEL = "6";

async function chat(systemPrompt, messages) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: systemPrompt,
    messages,
  });
  return response.content[0].text;
}

const SYSTEM = `You are a professional translator. Translate the given report to Thai.
Rules:
- Keep technical terms in English where appropriate (e.g. API, JWT, SQL, MVP, Next.js, OWASP, P0, P1, P2)
- Use clear, professional Thai suitable for a business co-owner
- Preserve markdown formatting (headings, lists, tables, bold, code blocks)
- Do not add or remove content — translate only`;

async function translate(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const filename = path.basename(filePath);
  const dir = path.dirname(filePath);
  const thDir = path.join(dir, "th");
  fs.mkdirSync(thDir, { recursive: true });
  const outPath = path.join(thDir, filename);

  console.log(`\nTranslating: ${filePath}`);
  console.log(`Output:      ${outPath}\n`);

  // Split large files into chunks by markdown sections to stay under token limit
  const MAX_CHARS = 5000;
  let translated;

  if (content.length <= MAX_CHARS) {
    translated = await chat(SYSTEM, [{ role: "user", content }]);
    console.log(translated);
  } else {
    console.log(`  (large file — translating in chunks)\n`);
    const sections = content.split(/(?=^## )/m);
    const chunks = [];
    let current = "";

    for (const section of sections) {
      if (current.length + section.length > MAX_CHARS && current.length > 0) {
        chunks.push(current);
        current = section;
      } else {
        current += section;
      }
    }
    if (current) chunks.push(current);

    const parts = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`  [chunk ${i + 1}/${chunks.length}]`);
      const part = await chat(SYSTEM, [{ role: "user", content: chunks[i] }]);
      console.log(part);
      parts.push(part);
    }
    translated = parts.join("\n\n");
  }

  fs.writeFileSync(outPath, translated);
  console.log(`\n✓ Thai translation saved: ${outPath}`);
}

async function translateAll() {
  const depts = ["tech", "marketing", "operations", "pm"];
  const base = path.resolve("departments");

  const files = [];
  for (const dept of depts) {
    const reportPath = path.join(base, dept, "report.md");
    if (fs.existsSync(reportPath)) files.push(reportPath);
    const teamReportPath = path.join(base, dept, "team-report.md");
    if (fs.existsSync(teamReportPath)) files.push(teamReportPath);
  }

  if (files.length === 0) {
    console.log("No reports found in departments/");
    process.exit(1);
  }

  console.log(`Found ${files.length} report(s) to translate:\n`);
  files.forEach((f) => console.log(`  - ${f}`));

  for (const file of files) {
    await translate(file);
    console.log();
  }

  console.log("✓ All translations complete.");
}

// CLI
const args = process.argv.slice(2);

if (args[0] === "all") {
  translateAll().catch(console.error);
} else if (args.length > 0) {
  // Translate specific file(s)
  (async () => {
    for (const file of args) {
      await translate(file);
    }
  })().catch(console.error);
} else {
  console.log(`
Usage:
  node translate.js <file>            Translate a single report to Thai
  node translate.js <file1> <file2>   Translate multiple reports
  node translate.js all               Translate all department reports

Output: saves alongside original as <name>-th.md

Examples:
  node translate.js departments/tech/report.md
  node translate.js departments/pm/report.md departments/tech/team-report.md
  node translate.js all
`);
}
