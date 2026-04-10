// cacheHealth.js — Cache safety checker for multi-agent meeting system
import crypto from "crypto";

const MIN_CACHE_TOKENS = 1024;

// ─── PATTERNS THAT BREAK CACHE ────────────────────────────────────────────────
const CACHE_BREAKERS = [
  {
    id: "timestamp_iso",
    label: "ISO timestamp",
    pattern: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g,
    fix: "Strip or normalize timestamps before injecting into system prompt.",
  },
  {
    id: "timestamp_date",
    label: "Date string (YYYY-MM-DD)",
    pattern: /\d{4}-\d{2}-\d{2}/g,
    fix: "Remove dates from system prompt. Put them in the user message instead.",
  },
  {
    id: "timestamp_time",
    label: "Time string (HH:MM:SS)",
    pattern: /\d{2}:\d{2}:\d{2}/g,
    fix: "Remove time values from system prompt.",
  },
  {
    id: "meeting_filename",
    label: "Meeting log filename with timestamp",
    pattern: /meeting-\d{4}-\d{2}-\d{2}T[\d\-]+\.md/g,
    fix: "Don't inject the last meeting filename into system prompt. Use generic label instead.",
  },
  {
    id: "new_date",
    label: "Rendered JS Date (e.g. Thu Apr 10 2026)",
    pattern: /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{4}/g,
    fix: "Don't call new Date().toString() inside system prompt builders.",
  },
  {
    id: "uuid",
    label: "UUID / random ID",
    pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    fix: "Don't generate UUIDs inside system prompts.",
  },
  {
    id: "trailing_whitespace",
    label: "Trailing whitespace on lines",
    pattern: /[ \t]+$/gm,
    fix: "Trim trailing whitespace from all system prompt lines.",
  },
  {
    id: "double_newline_variance",
    label: "Inconsistent blank lines (3+ newlines)",
    pattern: /\n{3,}/g,
    fix: "Normalize multiple blank lines to exactly two newlines.",
  },
];

// ─── HASH HELPER ──────────────────────────────────────────────────────────────
function hashPrompt(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 12);
}

// ─── SINGLE PROMPT CHECKER ────────────────────────────────────────────────────
function checkPrompt(agentKey, systemPrompt, tokenCount) {
  const issues = [];
  const warnings = [];

  // 1. Token length check
  if (tokenCount < MIN_CACHE_TOKENS) {
    issues.push({
      id: "too_short",
      label: "Prompt too short to cache",
      detail: `${tokenCount} tokens — minimum is ${MIN_CACHE_TOKENS}`,
      fix: "Add more detail to the agent system prompt (role, rules, context, reports).",
    });
  }

  // 2. Scan for cache breakers
  for (const breaker of CACHE_BREAKERS) {
    const matches = systemPrompt.match(breaker.pattern);
    if (matches) {
      const sample = matches[0].slice(0, 60);
      issues.push({
        id: breaker.id,
        label: breaker.label,
        detail: `Found ${matches.length} match(es). Example: "${sample}"`,
        fix: breaker.fix,
      });
    }
  }

  // 3. Warn if last meeting log content is injected
  // if (systemPrompt.includes("LAST MEETING LOG")) {
  //   warnings.push({
  //     id: "last_meeting_log",
  //     label: "Last meeting log injected into system prompt",
  //     detail: "Log content changes every meeting — this will break cache every run.",
  //     fix: "Move last meeting log into the first USER message instead of system prompt.",
  //   });
  // }

  // 4. Warn if department reports have dynamic content markers
  if (/updated:|last modified:|generated at:/i.test(systemPrompt)) {
    warnings.push({
      id: "report_dynamic_header",
      label: "Dynamic report header detected",
      detail: 'Found keywords like "updated:", "last modified:", "generated at:"',
      fix: "Strip dynamic headers from reports before injecting into system prompt.",
    });
  }

  return { agentKey, tokenCount, issues, warnings, hash: hashPrompt(systemPrompt) };
}

// ─── CONSISTENCY CHECKER (across calls) ───────────────────────────────────────
const _promptHashes = {};

export function checkPromptConsistency(agentKey, systemPrompt) {
  const hash = hashPrompt(systemPrompt);
  if (_promptHashes[agentKey] && _promptHashes[agentKey] !== hash) {
    return {
      consistent: false,
      message: `⚠️  [${agentKey}] system prompt changed between calls! Cache will miss every time.`,
      prevHash: _promptHashes[agentKey],
      newHash: hash,
    };
  }
  _promptHashes[agentKey] = hash;
  return { consistent: true };
}

// ─── MAIN CHECK FUNCTION ──────────────────────────────────────────────────────
export async function checkCacheHealth(agents, injectMeetingRules, client, model) {
  console.log("\n🔍 CACHE HEALTH CHECK");
  console.log("─".repeat(50));

  const results = [];
  let allClear = true;

  for (const [agentKey, agent] of Object.entries(agents)) {
    const systemPrompt = injectMeetingRules(agent.system);

    // Count tokens
    let tokenCount = 0;
    try {
      const res = await client.messages.countTokens({
        model,
        system: systemPrompt,
        messages: [{ role: "user", content: "hello" }],
      });
      tokenCount = res.input_tokens;
    } catch (e) {
      tokenCount = Math.floor(systemPrompt.length / 4); // rough fallback estimate
    }

    const result = checkPrompt(agentKey, systemPrompt, tokenCount);
    results.push(result);

    const hasProblems = result.issues.length > 0 || result.warnings.length > 0;
    if (hasProblems) allClear = false;

    // Print result for this agent
    const status = result.issues.length > 0 ? "❌" : result.warnings.length > 0 ? "⚠️ " : "✅";
    console.log(`\n${status} [${agentKey}] — ${tokenCount} tokens | hash: ${result.hash}`);

    for (const issue of result.issues) {
      console.log(`   ❌ ISSUE: ${issue.label}`);
      console.log(`      Found: ${issue.detail}`);
      console.log(`      Fix:   ${issue.fix}`);
    }

    for (const warn of result.warnings) {
      console.log(`   ⚠️  WARN: ${warn.label}`);
      console.log(`      Found: ${warn.detail}`);
      console.log(`      Fix:   ${warn.fix}`);
    }

    if (!hasProblems) {
      console.log(`   Cache-safe ✓`);
    }
  }

  console.log("\n" + "─".repeat(50));

  if (allClear) {
    console.log("✅ All agents are cache-safe. Proceeding.\n");
  } else {
    console.log("⚠️  Some agents have cache issues listed above.");
    console.log("   Fix them for maximum cache savings.\n");
  }

  return { allClear, results };
}

// ─── STRIP CACHE BREAKERS HELPER ─────────────────────────────────────────────
// Call this on report content BEFORE injecting into system prompt
export function sanitizeForCache(text) {
  return text
    .replace(/meeting-\d{4}-\d{2}-\d{2}T[\d\-]+\.md/g, "meeting-[REDACTED].md")
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?/g, "[TIMESTAMP]")
    .replace(/\d{4}-\d{2}-\d{2}/g, "[DATE]")
    .replace(/\d{2}:\d{2}:\d{2}/g, "[TIME]")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}