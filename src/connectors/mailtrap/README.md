# Mailtrap Email Connector

Mailtrap email connector using the Send API with Bearer token authentication.

## Config

| Field        | Type     | Required | Description                 |
|--------------|----------|----------|-----------------------------|
| `apiToken`   | `string` | Yes      | Mailtrap API token          |
| `from`       | `string` | Yes      | Default sender email        |
| `senderName` | `string` | No       | Default sender display name |

## Features

### Attachments

Attachments are sent as base64-encoded objects with `filename`, `content`, and `type` (MIME) fields.

### CC / BCC

Pass `cc` and `bcc` arrays in the email options:

```typescript
await mailtrap.sendMessage({
  to: ['recipient@example.com'],
  subject: 'Hello',
  html: '<p>Hello</p>',
  cc: ['cc@example.com'],
  bcc: ['bcc@example.com'],
});
```

### Passthrough

Use `_passthrough.body` to add fields like `category` or `custom_variables` directly to the Mailtrap API request body.

## Quirks

- The connector does not support `replyTo`.
- The response returns a `message_ids` array; the connector uses the first element as the message ID.

## API

- **Endpoint:** `POST https://send.api.mailtrap.io/api/send`
- **Auth:** Bearer token via `Authorization` header
- **Provider ID:** `mailtrap` (matches `EmailProviderIdEnum.Mailtrap`)
- **API Reference:** [Mailtrap Email Sending API](https://api-docs.mailtrap.io/docs/mailtrap-api-docs/67f1d70aeb62c-send-email)
