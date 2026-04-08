import { Codex } from "@openai/codex-sdk";

const task = process.argv.slice(2).join(" ").trim() || [
  "You are helping with a JavaScript repository.",
  "Review the codebase structure and suggest one small, safe refactor.",
  "Return a short title and 3 bullet points."
].join(" ");

async function main() {
  const codex = new Codex();
  const thread = codex.startThread();
  const turn = await thread.run(task);

  console.log("Thread ID:", thread.id);
  console.log("");
  console.log(turn.finalResponse);
}

main().catch((error) => {
  console.error("Request failed:");
  console.error(error);
  process.exit(1);
});
