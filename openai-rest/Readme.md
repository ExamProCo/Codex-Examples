bundle install
bundle exec ruby openai_rest.rb

curl https://api.openai.com/v1/responses \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4.1-mini",
    "input": "Give me bulleted list of studying tips to pass the JLPT N5"
  }'
