# MS Teams Chat Connector

Microsoft Teams chat connector using incoming webhooks with Adaptive Cards.

## Config

| Field        | Type     | Required | Description                              |
|--------------|----------|----------|------------------------------------------|
| `webhookUrl` | `string` | No       | Default MS Teams incoming webhook URL    |

## Features

### Webhook URL Resolution
The webhook URL is resolved from `options.webhookUrl` first, then falls back to `config.webhookUrl`. At least one must be provided.

### Adaptive Card Format
Messages are automatically wrapped in an Adaptive Card v1.4 with a `TextBlock` body. The card uses `application/vnd.microsoft.card.adaptive` content type and `wrap: true` for text content.

### Passthrough
Use `_passthrough.body` to override the Adaptive Card payload, for example to provide custom card bodies, actions, or additional attachments.

## Quirks
- Incoming webhooks don't return a message ID -- `id` in the response is `undefined`.
- The webhook URL itself acts as authentication (no separate auth header).
- Error responses from Teams are plain strings, not JSON.

## API
- **Endpoint:** MS Teams incoming webhook URL
- **Auth:** None (URL is auth)
- **Format:** JSON (Adaptive Card)
- **Provider ID:** `msteams` (matches `ChatProviderIdEnum.MsTeams`)
- **API Reference:** [MS Teams Incoming Webhooks](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook)
