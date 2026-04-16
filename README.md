# EmoRatio

Discord bot that tracks per-user positive/negative message sentiment ratio. Uses Ollama local LLM for multilingual (French/English) sentiment analysis.

Inspired by [Monitori](https://github.com/ajyuan/Monitori).

## Requirements

- Node.js 20+
- [Ollama](https://ollama.ai) running locally (`ollama serve`)
- A small model pulled: `ollama pull llama3.2:3b`

## Setup

```bash
cp .env.example .env
# Edit .env with your Discord bot token, client ID, guild ID

npm install
npm run build
npm start
```

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
2. Each message sent to Ollama for sentiment classification
3. Returns label (positive/negative/neutral) + score (-1.0 to 1.0)
4. Stored in SQLite, user stats updated
5. Slash commands query aggregated stats

## Dev

```bash
npm run dev    # Run with tsx (hot reload)
npm run build  # Build with tsup
npm start      # Run built version
```

## Built With

This project was built with the assistance of LLM-based coding agents.
