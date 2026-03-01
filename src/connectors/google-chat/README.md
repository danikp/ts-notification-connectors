# Google Chat Connector

Google Chat connector using incoming webhooks.

## Config

| Field        | Type     | Required | Description                                |
|--------------|----------|----------|--------------------------------------------|
| `webhookUrl` | `string` | No       | Default Google Chat incoming webhook URL   |

## Features

### Webhook URL Resolution
The webhook URL is resolved from `options.webhookUrl` first, then falls back to `config.webhookUrl`. At least one must be provided.

### Message ID
The response `name` field from Google Chat (e.g. `spaces/SPACE_ID/messages/MESSAGE_ID`) is returned as the message `id`.

### Passthrough
Use `_passthrough.body` to add Google Chat-specific fields like `cards`, `cardsV2`, `thread`, or `actionResponse`.

## API
- **Endpoint:** Google Chat incoming webhook URL
- **Auth:** None (URL is auth)
- **Format:** JSON
- **Provider ID:** `google-chat` (matches `ChatProviderIdEnum.GoogleChat`)
- **API Reference:** [Google Chat Webhooks](https://developers.google.com/workspace/chat/quickstart/webhooks)
