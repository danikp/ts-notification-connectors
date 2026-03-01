# SparkPost Email Connector

SparkPost email connector using the Transmissions API with API key authentication.

## Config

| Field        | Type     | Required | Description                                        |
|--------------|----------|----------|----------------------------------------------------|
| `apiKey`     | `string` | Yes      | SparkPost API key                                  |
| `from`       | `string` | Yes      | Default sender email                               |
| `senderName` | `string` | No       | Default sender display name                        |
| `region`     | `string` | No       | Set to `'eu'` for EU endpoint; defaults to US      |

## Features

### Attachments

Attachments are sent as base64-encoded objects in the `content.attachments` array with `name`, `type` (MIME), and `data` fields.

### CC / BCC

CC and BCC recipients are merged into the `recipients` array alongside primary recipients:

```typescript
await sparkpost.sendMessage({
  to: ['recipient@example.com'],
  subject: 'Hello',
  html: '<p>Hello</p>',
  cc: ['cc@example.com'],
  bcc: ['bcc@example.com'],
});
```

### Reply-To

Set `replyTo` in the email options to populate `content.reply_to`.

### Passthrough

Use `_passthrough.body` to add fields like `options`, `metadata`, or `campaign_id` directly to the SparkPost API request body.

## Quirks

- CC and BCC recipients are flattened into the top-level `recipients` array. SparkPost does not have separate CC/BCC fields; all recipients are treated equally at the API level.
- The `Authorization` header is set to the raw API key (no `Bearer` prefix).
- The payload is split into `recipients` (top-level) and `content` (nested object containing `from`, `subject`, `html`, `text`, `reply_to`, and `attachments`).

## API

- **Endpoint:** `POST https://api.sparkpost.com/api/v1/transmissions` (US) or `POST https://api.eu.sparkpost.com/api/v1/transmissions` (EU)
- **Auth:** API key in `Authorization` header (no prefix)
- **Provider ID:** `sparkpost` (matches `EmailProviderIdEnum.SparkPost`)
- **API Reference:** [SparkPost Transmissions API](https://developers.sparkpost.com/api/transmissions/)
