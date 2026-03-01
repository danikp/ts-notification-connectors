# SendGrid Email Connector

Twilio SendGrid email connector using the v3 Mail Send API with Bearer token authentication.

## Config

| Field        | Type     | Required | Description                 |
|--------------|----------|----------|-----------------------------|
| `apiKey`     | `string` | Yes      | SendGrid API key            |
| `from`       | `string` | Yes      | Default sender email        |
| `senderName` | `string` | No       | Default sender display name |

## Features

### Attachments

Attachments are sent as base64-encoded objects in the `attachments` array. Each attachment includes `content`, `type` (MIME), and `filename`.

### CC / BCC

Pass `cc` and `bcc` arrays in the email options:

```typescript
await sendgrid.sendMessage({
  to: ['recipient@example.com'],
  subject: 'Hello',
  html: '<p>Hello</p>',
  cc: ['cc@example.com'],
  bcc: ['bcc@example.com'],
});
```

### Reply-To

Set `replyTo` in the email options to populate the `reply_to` field.

### Passthrough

Use `_passthrough.body` to add fields like `tracking_settings`, `asm`, or `categories` directly to the SendGrid API request body.

## Quirks

- SendGrid returns `202 Accepted` with no response body on success. The message ID is extracted from the `x-message-id` response header.
- The `content` array can include both `text/plain` and `text/html` entries simultaneously.

## API

- **Endpoint:** `POST https://api.sendgrid.com/v3/mail/send`
- **Auth:** Bearer token via `Authorization` header
- **Provider ID:** `sendgrid` (matches `EmailProviderIdEnum.SendGrid`)
- **API Reference:** [SendGrid Mail Send v3](https://docs.sendgrid.com/api-reference/mail-send/mail-send)
