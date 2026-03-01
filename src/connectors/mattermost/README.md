# Mattermost Chat Connector

Mattermost chat connector using incoming webhooks.

## Config

| Field        | Type     | Required | Description                                |
|--------------|----------|----------|--------------------------------------------|
| `webhookUrl` | `string` | No       | Default Mattermost incoming webhook URL    |

## Features

### Webhook URL Resolution
The webhook URL is resolved from `options.webhookUrl` first, then falls back to `config.webhookUrl`. At least one must be provided.

### Channel Override
If `options.channel` is provided, it is included in the payload to override the webhook's default channel.

### Passthrough
Use `_passthrough.body` to add Mattermost-specific fields like `username`, `icon_url`, `icon_emoji`, `attachments`, or `props`.

## Quirks
- Incoming webhooks don't return a message ID -- `id` in the response is `undefined`.
- The webhook URL itself acts as authentication (no separate auth header).

## API
- **Endpoint:** Mattermost incoming webhook URL
- **Auth:** None (URL is auth)
- **Format:** JSON
- **Provider ID:** `mattermost` (matches `ChatProviderIdEnum.Mattermost`)
- **API Reference:** [Mattermost Incoming Webhooks](https://developers.mattermost.com/integrate/webhooks/incoming/)
