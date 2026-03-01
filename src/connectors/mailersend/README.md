# MailerSend Email Connector

MailerSend email connector using the v1 Email API with Bearer token authentication.

## Config

| Field        | Type     | Required | Description                 |
|--------------|----------|----------|-----------------------------|
| `apiToken`   | `string` | Yes      | MailerSend API token        |
| `from`       | `string` | Yes      | Default sender email        |
| `senderName` | `string` | No       | Default sender display name |

## Features

### Attachments

Attachments are sent as base64-encoded objects with `filename`, `content`, and `content_type` fields.

### CC / BCC

Pass `cc` and `bcc` arrays in the email options:

```typescript
await mailersend.sendMessage({
  to: ['recipient@example.com'],
  subject: 'Hello',
  html: '<p>Hello</p>',
  cc: ['cc@example.com'],
  bcc: ['bcc@example.com'],
});
```

### Reply-To

Set `replyTo` in the email options. The value is wrapped in an array of objects: `[{ email: replyTo }]`.

### Passthrough

Use `_passthrough.body` to add fields like `template_id`, `tags`, or `settings` directly to the MailerSend API request body.

## Quirks

- MailerSend returns `202 Accepted` with no response body on success. The message ID is extracted from the `x-message-id` response header.
- The `reply_to` field is an array of email objects, not a single object.

## API

- **Endpoint:** `POST https://api.mailersend.com/v1/email`
- **Auth:** Bearer token via `Authorization` header
- **Provider ID:** `mailersend` (matches `EmailProviderIdEnum.MailerSend`)
- **API Reference:** [MailerSend Email API](https://developers.mailersend.com/api/v1/email.html#send-an-email)
