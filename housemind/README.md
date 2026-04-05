# Copilot Instructions

This repo runs a multi-agent leadership team. When the user asks to run a meeting or discuss a topic, you run the agents.

## How to run a meeting

```bash
node agents/run.js "your topic here"
```

Always run this in the terminal when the user gives a topic or decision to discuss.

## After the meeting

The PM will ask the user one question. Wait for the user to answer in chat, then run the next meeting with their answer as context:

```bash
node agents/run.js "your topic — founder direction: their answer"
```

## What the files do

- `agents/agents.js` — defines Marketing, Ops, Tech, and PM agents. Edit here to change what each agent cares about.
- `agents/run.js` — the orchestration loop. Edit here to change number of rounds or flow.

## Rules

- Never edit agent personalities without the user asking
- Always show the full PM output before asking for user direction
- If the user says "change marketing to focus on X" — edit `agents/agents.js` directly