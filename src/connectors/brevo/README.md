# Brevo Email Connector

Brevo (formerly Sendinblue) email connector using the v3 SMTP Email API with `api-key` header authentication.

## Config

| Field        | Type     | Required | Description                 |
|--------------|----------|----------|-----------------------------|
| `apiKey`     | `string` | Yes      | Brevo API key               |
| `from`       | `string` | Yes      | Default sender email        |
| `senderName` | `string` | No       | Default sender display name |

## Features

### Attachments

Attachments are sent as base64-encoded objects in the `attachment` array with `name` and `content` fields.

### CC / BCC

Pass `cc` and `bcc` arrays in the email options:

```typescript
await brevo.sendMessage({
  to: ['recipient@example.com'],
  subject: 'Hello',
  html: '<p>Hello</p>',
  cc: ['cc@example.com'],
  bcc: ['bcc@example.com'],
});
```

### Reply-To

Set `replyTo` in the email options. The value is wrapped in an object: `{ email: replyTo }`.

### Passthrough

Use `_passthrough.body` to add fields like `templateId`, `params`, `tags`, or `scheduledAt` directly to the Brevo API request body.

## Quirks

- Brevo uses **camelCase** for request body fields (`htmlContent`, `textContent`, `replyTo`).
- The sender field is named `sender` (not `from`).
- The attachment array field is singular (`attachment`), not plural.

## API

- **Endpoint:** `POST https://api.brevo.com/v3/smtp/email`
- **Auth:** `api-key` header
- **Provider ID:** `brevo` (matches `EmailProviderIdEnum.Brevo`)
- **API Reference:** [Brevo Transactional Email API](https://developers.brevo.com/reference/sendtransacemail)
