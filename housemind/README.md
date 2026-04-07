# HouseMind — Multi-Agent AI Simulation

Multi-agent company simulation for HouseMind. Agents run as LLM pipelines using **claude-sonnet-4-5** via Anthropic API. Key file: `../key.txt`.

---

## How every run works (auto dry-run)

**Every script automatically does a dry run first**, then asks you to confirm before spending tokens.

```
🔍 DRY RUN — estimating prompts and tokens...

  ┌ SYSTEM: You are Head of Marketing...
  │ USER: Task: Design the annotation workspace...
  └ ~1050 tokens

... (all agents shown) ...

--- Dry run complete ---
Total input tokens: ~8200
Estimated input cost: ~$0.0246

Proceed with real run? [y/N]
```

Type `y` + Enter to run for real. Type `n` (or just Enter) to abort.

---

## Scripts

### `node team.js <team> <task>` — Team pipeline
Runs a full hierarchical team: Head breaks down → sub-agents work → Head consolidates.

```bash
# Marketing team (6 agents)
node team.js marketing "Design the annotation workspace for Phase 1 MVP"

# Tech team (6 agents)
node team.js tech "Build the full annotation system — frontend, API, DB, QA, security"

# Cross-team standup (paired agents)
node team.js scrum "Does the UI design match what frontend can actually build?"

# Dry-run ONLY (no confirm prompt, just token estimate and exit)
node team.js marketing --dry-run "Design the annotation workspace"
```

Teams auto-read the other team's latest `team-report.md` as cross-team context.

---

### `node run.js ["topic"]` — Executive meeting
All department heads (Marketing, Ops, Tech) debate a topic for 4 rounds, then PM synthesises.

```bash
node run.js "Should we merge the Flask prototype into Next.js or rebuild from scratch?"

# Dry-run only
node run.js --dry-run "topic"
```

---

### `node department.js <dept> <task>` — Solo department work
One department head does 3-phase deep work (research → deep work → report).

```bash
node department.js tech "Solve the god-page architecture for /projects/[id]"
node department.js marketing "Plan beta launch messaging for architects"
node department.js operations "Build the product catalog curation plan"
node department.js pm   # PM reads all dept reports and synthesises

# Dry-run only
node department.js tech --dry-run "Solve the god-page architecture"
```

---

### `node chat.js` — Interactive PM chat
Persistent PM session with ticket board and chat history.

```bash
node chat.js
```

---

### `node translate.js [file]` — Thai translation
Translates any report to Thai (chunked for large files).

```bash
node translate.js departments/tech/report.md
node translate.js   # translates all dept reports at once
```

---

## Saved outputs

```
departments/
  tech/
    report.md           ← latest solo dept report
    team-report.md      ← latest team pipeline report
    team-runs/          ← every run timestamped
  marketing/
    team-report.md      ← used as cross-team context by tech
    team-runs/2026-04-06T01-29-54-273Z/
      0-head-breakdown.md
      1-brand.md ... 6-community.md
      final-report.md   ← head consolidation (run to complete)
  scrum-logs/
logs/                   ← meeting logs from run.js
```

---

## Model & cost

- Model: `claude-sonnet-4-5`
- Input: ~$0.003 / 1K tokens
- Full team pipeline (~10 calls): ~$0.03–0.08
- Full meeting (4 rounds): ~$0.01–0.02

---

## Rules for Copilot

- Never edit agent personalities without the user asking
- Always show full PM output before asking for founder direction
- Always run dry-run first and show token estimate before real run
- Key file is `../key.txt` relative to housemind/

## What each script produces

| Script | Output | Use it to |
|---|---|---|
| `chat.js` | `pm/chat-log.md` | Catch up on what you told PM, daily check-ins |
| `department.js pm` | `pm/report.md` | Get PM synthesis of all dept reports |
| `department.js <dept>` | `departments/<dept>/report.md` | See solo dept head deep work |
| `run.js` | `logs/meeting-*.md` | Review what was decided in executive meetings |
| `team.js <dept>` | `departments/<dept>/team-report.md` | See full team's work output |
