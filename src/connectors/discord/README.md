# Discord Chat Connector

Discord chat connector using incoming webhooks.

## Config

| Field        | Type     | Required | Description                             |
|--------------|----------|----------|-----------------------------------------|
| `webhookUrl` | `string` | No       | Default Discord incoming webhook URL    |

## Features

### Webhook URL Resolution
The webhook URL is resolved from `options.webhookUrl` first, then falls back to `config.webhookUrl`. At least one must be provided.

### Wait Mode
The connector appends `?wait=true` to the webhook URL, which makes Discord return the created message object instead of `204 No Content`. This provides a real message `id` in the response.

### Passthrough
Use `_passthrough.body` to add Discord-specific fields like `embeds`, `username`, `avatar_url`, `tts`, or `allowed_mentions`.

## API
- **Endpoint:** Discord webhook URL (with `?wait=true`)
- **Auth:** None (URL is auth)
- **Format:** JSON
- **Provider ID:** `discord` (matches `ChatProviderIdEnum.Discord`)
- **API Reference:** [Discord Webhooks](https://discord.com/developers/docs/resources/webhook#execute-webhook)
