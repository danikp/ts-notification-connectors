# Resend Email Connector

Resend email connector using the REST API with Bearer token authentication.

## Config

| Field        | Type     | Required | Description                    |
|--------------|----------|----------|--------------------------------|
| `apiKey`     | `string` | Yes      | Resend API key (starts `re_`)  |
| `from`       | `string` | Yes      | Default sender email           |
| `senderName` | `string` | No       | Default sender display name    |

## Features

### Attachments

Attachments are sent as base64-encoded content in the JSON body. Supports `filename`, `content`, and `content_type` fields.

### CC / BCC / Reply-To

Pass `cc`, `bcc`, and `replyTo` in the email options (mapped to Resend's `reply_to` field).

### Passthrough

Use `_passthrough.body` to add Resend-specific fields like `tags`, `scheduled_at`, or custom `headers`.

## API

- **Endpoint:** `POST https://api.resend.com/emails`
- **Auth:** Bearer token
- **Format:** JSON
- **Provider ID:** `resend` (matches `EmailProviderIdEnum.Resend`)
