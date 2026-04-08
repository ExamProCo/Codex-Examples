# Codex SDK Example

This folder now contains a minimal example that uses the official Codex SDK for TypeScript/Node.

## Files

- `package.json` installs the official `@openai/codex-sdk` package and adds a runnable script.
- `examples/codex-official-sdk.mjs` starts a Codex thread and runs a prompt on it.
- `.env.example` shows the required environment variable.

## Run it

```bash
npm install
export OPENAI_API_KEY="your_api_key_here"
npm run codex:example
```

You can also pass your own coding task:

```bash
npm run codex:example -- "Explain how you would add tests for an Express route module."
```

The example follows the official Codex SDK pattern:

```js
import { Codex } from "@openai/codex-sdk";

const codex = new Codex();
const thread = codex.startThread();
const result = await thread.run("Make a plan to diagnose and fix the CI failures");
```

Source:

- https://developers.openai.com/codex/sdk
