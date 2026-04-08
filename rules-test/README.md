# Sinatra Test App

This project contains a small Sinatra app with a couple of endpoints you can test with `curl`.

## Install

```bash
bundle install --path vendor/bundle
```

## Run

```bash
bundle exec ruby app.rb
```

The app listens on `http://127.0.0.1:4567`.

## Test With curl

Check the root endpoint:

```bash
curl http://127.0.0.1:4567/
```

Call the hello endpoint:

```bash
curl http://127.0.0.1:4567/hello/Andrew
```

Send JSON to the echo endpoint:

```bash
curl -X POST http://127.0.0.1:4567/echo \
  -H "Content-Type: application/json" \
  -d '{"status":"ok","count":2}'
```

Try the validation error case:

```bash
curl -X POST http://127.0.0.1:4567/echo \
  -H "Content-Type: application/json" \
  -d 'not-json'
```
