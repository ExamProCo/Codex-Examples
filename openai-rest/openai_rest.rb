require "json"
require "httparty"

api_key = ENV["OPENAI_API_KEY"]

if api_key.to_s.empty?
  warn "OPENAI_API_KEY is not set."
  warn "Run: export OPENAI_API_KEY=your_api_key_here"
  exit 1
end

prompt = ARGV.join(" ").strip
prompt = "Give me bulleted list of studying tips to pass the JLPT N5" if prompt.empty?

response = HTTParty.post(
  "https://api.openai.com/v1/responses",
  headers: {
    "Authorization" => "Bearer #{api_key}",
    "Content-Type" => "application/json"
  },
  body: {
    model: "gpt-4.1-mini",
    input: prompt
  }.to_json
)

unless response.success?
  warn "Request failed: #{response.code}"
  warn response.body
  exit 1
end

parsed = JSON.parse(response.body)
text = parsed.dig("output", 0, "content", 0, "text")

if text.to_s.empty?
  puts JSON.pretty_generate(parsed)
else
  puts text
end
