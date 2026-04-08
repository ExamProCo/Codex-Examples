require "sinatra"
require "json"

set :bind, "0.0.0.0"
set :port, ENV.fetch("PORT", 4567)

before do
  content_type :json
end

get "/" do
  {
    message: "Sinatra app is running",
    endpoints: [
      "GET /hello/:name",
      "POST /echo"
    ]
  }.to_json
end

get "/hello/:name" do
  {
    greeting: "Hello, #{params[:name]}!",
    method: request.request_method
  }.to_json
end

post "/echo" do
  request.body.rewind
  payload = request.body.read

  parsed_payload =
    if payload.empty?
      {}
    else
      JSON.parse(payload)
    end

  {
    received: parsed_payload,
    content_type: request.content_type
  }.to_json
rescue JSON::ParserError
  status 400
  {
    error: "Request body must be valid JSON"
  }.to_json
end
