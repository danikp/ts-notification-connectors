# Postmark Email Connector

Postmark email connector using the Send Email API with `X-Postmark-Server-Token` header authentication.

## Config

| Field         | Type     | Required | Description                 |
|---------------|----------|----------|-----------------------------|
| `serverToken` | `string` | Yes      | Postmark server API token   |
| `from`        | `string` | Yes      | Default sender email        |
| `senderName`  | `string` | No       | Default sender display name |

## Features

### Attachments

Attachments are sent as PascalCase objects in the `Attachments` array with `Name`, `Content` (base64), and `ContentType` fields.

### CC / BCC

Pass `cc` and `bcc` arrays in the email options. Recipients are joined into comma-separated strings:

```typescript
await postmark.sendMessage({
  to: ['recipient@example.com'],
  subject: 'Hello',
  html: '<p>Hello</p>',
  cc: ['cc@example.com'],
  bcc: ['bcc@example.com'],
});
```

### Reply-To

Set `replyTo` in the email options to populate the `ReplyTo` field.

### Passthrough

Use `_passthrough.body` to add fields like `Tag`, `TrackOpens`, `TrackLinks`, or `MessageStream` directly to the Postmark API request body.

## Quirks

- Postmark uses **PascalCase** for all request body fields (`From`, `To`, `Subject`, `HtmlBody`, `TextBody`).
- The API may return a `200` status with a non-zero `ErrorCode` in the response body. The connector checks `ErrorCode` and throws a `ConnectorError` when it is non-zero.
- `To`, `Cc`, and `Bcc` are comma-separated strings, not arrays of objects.

## API

- **Endpoint:** `POST https://api.postmarkapp.com/email`
- **Auth:** `X-Postmark-Server-Token` header
- **Provider ID:** `postmark` (matches `EmailProviderIdEnum.Postmark`)
- **API Reference:** [Postmark Send Email API](https://postmarkapp.com/developer/api/email-api#send-a-single-email)
