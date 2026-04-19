# EmoRatio

Discord bot that tracks per-user positive/negative message sentiment ratio. Uses [XLM-RoBERTa Twitter Sentiment](https://huggingface.co/cardiffnlp/twitter-xlm-roberta-base-sentiment) ([ONNX build](https://huggingface.co/onnx-community/twitter-xlm-roberta-base-sentiment-ONNX)) via [Transformers.js](https://huggingface.co/docs/transformers.js). Multilingual (Ar, En, Fr, De, Hi, It, Sp, Pt), runs fully locally, no external service.

Inspired by [Monitori](https://github.com/ajyuan/Monitori).

## Requirements

- Node.js 24+
- ~270 MB disk for model cache (downloaded on first run)

## Setup

```bash
cp .env.example .env
# Edit .env with your Discord bot token, client ID, guild ID

npm install
npm run build
npm start
```

## Docker

Single-container setup. Model cache and SQLite DB persisted via named volumes.

```bash
cp .env.example .env
# Fill BOT_TOKEN, CLIENT_ID, GUILD_ID

docker compose up -d --build
docker compose logs -f bot
```

### Volumes

| Volume | Mount | Purpose |
|--------|-------|---------|
| `bot_data` | `/app/data` | SQLite database (survives rebuilds) |
| `model_cache` | `/app/.cache` | XLM-RoBERTa ONNX weights (~270 MB; downloaded once) |

First launch downloads the model → ~1-2 min depending on network. Subsequent starts read from `model_cache` → ready in seconds.

### Common ops

```bash
docker compose up -d --build   # (re)build and start
docker compose restart bot     # restart after .env change
docker compose down            # stop (volumes kept)
docker compose down -v         # stop + wipe data + cache
docker compose pull            # update base images
```

### Raspberry Pi / ARM

Dockerfile uses `node:24-slim` (multi-arch). Runs on Pi 4/5 (arm64) out of the box. Expect 300-800 ms per message on Pi 5 CPU. Give the container at least 1 GB RAM.

### Discord Bot Permissions

- **Intents:** `GUILDS`, `GUILD_MESSAGES`, `MESSAGE_CONTENT`
- **Scopes:** `bot`, `applications.commands`

## Commands

| Command | Description |
|---------|-------------|
| `/moodcheck` | Show your sentiment ratio |
| `/moodcheck @user` | Show someone else's ratio |
| `/moodboard` | Top 10 most positive & negative users |
| `/freerant true/false` | Toggle server-wide freerant — ignores all negative messages (admin only) |

## How It Works

1. Bot listens to all messages (skips bots, commands, <3 chars)
2. Message preprocessed (mentions, URLs, custom emotes normalized)
3. Classified locally via XLM-RoBERTa ONNX (q8 quantized, CPU-friendly)
4. Returns label (positive/negative/neutral) + score (`P(pos) - P(neg)`, range -1.0 to 1.0)
5. Stored in SQLite, user stats updated
6. Slash commands query aggregated stats

**Ratio formula:** `positive_count / (positive_count + negative_count)` — fraction of emotional messages that are positive. Neutrals excluded. Users need ≥10 messages to appear on `/moodboard`.

## Dev

```bash
npm run dev    # Run with tsx (hot reload)
npm run build  # Build with tsup
npm start      # Run built version
```

## Security

Local classification model — no prompts, no LLM, no external API. Eliminates prompt injection vector entirely. Additional hardening:

- **Input length cap** — messages truncated to 500 chars before tokenization (bounds per-message CPU).
- **Queue size cap** — max 1000 pending items; excess rejected to prevent memory exhaustion under flood.
- **Per-user rate limit** — sliding window, 30 messages/user/minute. Stops single-account spam from monopolizing queue/CPU.
- **Parameterized SQL** — all DB writes via `better-sqlite3` prepared statements (no injection).
- **Deterministic inference** — argmax over softmax; no sampling, no hallucinated output.
- **Bounded model context** — tokenizer truncates at 128 tokens; oversized inputs can't blow up inference cost.

Residual considerations:

- Adversarial text can skew sentiment stats (not a security issue, just accuracy).
- Model cache downloaded from Hugging Face on first run over HTTPS; pin `@huggingface/transformers` version and run `npm audit` in CI.
- Run the Docker container as non-root if deploying to shared hosts.

## Built With

This project was built with the assistance of LLM-based coding agents.
