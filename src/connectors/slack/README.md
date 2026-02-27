# Slack Chat Connector

Slack chat connector using incoming webhooks.

## Config

| Field        | Type     | Required | Description                           |
|--------------|----------|----------|---------------------------------------|
| `webhookUrl` | `string` | No       | Default Slack incoming webhook URL    |

## Features

### Webhook URL Resolution
The webhook URL is resolved from `options.webhookUrl` first, then falls back to `config.webhookUrl`. At least one must be provided.

### Passthrough
Use `_passthrough.body` to add Slack-specific fields like `blocks`, `attachments`, `unfurl_links`, or `unfurl_media`.

## Quirks
- Incoming webhooks don't return a message ID — `id` in the response is `undefined`.
- The webhook URL itself acts as authentication (no separate auth header).

## API
- **Endpoint:** Slack incoming webhook URL
- **Auth:** None (URL is auth)
- **Format:** JSON
- **Provider ID:** `slack` (matches `ChatProviderIdEnum.Slack`)
