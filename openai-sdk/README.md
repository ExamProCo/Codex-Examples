# OpenAI SDK Image Generation Demo

This project demonstrates image generation with the official OpenAI Node SDK.

## Setup

Install the SDK:

```bash
npm install openai
```

Set your API key:

```bash
export OPENAI_API_KEY="your_api_key_here"
```

## Run

Use the default prompt:

```bash
npm run generate:image
```

Or pass your own prompt:

```bash
npm run generate:image -- "A neon-lit city street in the rain, cinematic, highly detailed"
```

The script writes the generated file to `output/generated-image.png`.

## Main Example

```js
const result = await client.images.generate({
  model: "gpt-image-1",
  prompt,
  size: "1024x1024"
});
```

The response includes base64-encoded image data, which the script decodes and saves as a PNG.

## Official docs

- https://platform.openai.com/docs/guides/image-generation
- https://platform.openai.com/docs/libraries
