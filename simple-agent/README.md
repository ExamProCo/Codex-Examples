# Simple OpenAI Agent SDK Example

Minimal TypeScript example using the OpenAI Agents SDK.

## Requirements

- Node.js 22+
- An OpenAI API key

## Setup

```bash
npm install
cp .env.example .env
```

Add your API key to `.env`.

## Run

```bash
npm run dev -- "What time is it right now?"
```

After the first response, the process stays open so you can continue chatting. Type `exit` or `quit` to stop.

By default the agent uses `gpt-5-mini`. Set `OPENAI_MODEL` to override it.

## Build

```bash
npm run build
npm start -- "Give me a one-sentence summary of what you can do."
```
