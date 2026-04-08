import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("Missing OPENAI_API_KEY.");
  console.error("Set it before running this script.");
  process.exit(1);
}

const prompt =
  process.argv.slice(2).join(" ") ||
  "A clean product illustration of a glass teapot on a wooden table, morning light, high detail";

const client = new OpenAI({ apiKey });
const outputDir = path.resolve("output");
const outputFile = path.join(outputDir, "generated-image.png");

try {
  const result = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024"
  });

  const imageBase64 = result.data?.[0]?.b64_json;

  if (!imageBase64) {
    throw new Error("The API response did not include image data.");
  }

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputFile, Buffer.from(imageBase64, "base64"));

  console.log(`Prompt: ${prompt}`);
  console.log(`Saved: ${outputFile}`);
} catch (error) {
  console.error("Image generation failed.");
  console.error(error);
  process.exit(1);
}
