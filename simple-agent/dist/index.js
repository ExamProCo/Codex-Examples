import 'dotenv/config';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { Agent, run, tool } from '@openai/agents';
import { MemorySession } from '@openai/agents-core';
const prompt = process.argv.slice(2).join(' ').trim();
if (!process.env.OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY. Add it to your environment or a .env file.');
    process.exit(1);
}
const assistant = new Agent({
    name: 'Simple TypeScript Agent',
    instructions: 'You are a concise assistant. Use the time tool when the user asks about the current time or date.',
    model: process.env.OPENAI_MODEL || 'gpt-5-mini',
    tools: [
        tool({
            name: 'get_current_time',
            description: 'Returns the current local date and time for the machine running this script.',
            parameters: {
                type: 'object',
                properties: {},
                required: [],
                additionalProperties: false,
            },
            async execute() {
                return {
                    now: new Date().toLocaleString(),
                };
            },
        }),
    ],
});
const exitCommands = new Set(['exit', 'quit']);
const session = new MemorySession();
async function runTurn(userInput) {
    const result = await run(assistant, userInput, { session });
    console.log(`\nAssistant: ${result.finalOutput}\n`);
}
async function main() {
    const initialInput = prompt || 'Introduce yourself in 2 short sentences and tell me what tools you can use.';
    await runTurn(initialInput);
    if (!input.isTTY || !output.isTTY) {
        return;
    }
    const rl = readline.createInterface({ input, output });
    console.log('Enter another message, or type "exit" to quit.\n');
    try {
        while (true) {
            const userInput = (await rl.question('You: ')).trim();
            if (!userInput) {
                continue;
            }
            if (exitCommands.has(userInput.toLowerCase())) {
                break;
            }
            await runTurn(userInput);
        }
    }
    finally {
        rl.close();
    }
}
main().catch((error) => {
    console.error('Agent run failed.');
    console.error(error);
    process.exit(1);
});
