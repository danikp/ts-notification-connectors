# Mailgun Email Connector

Mailgun email connector using the Messages API with HTTP Basic authentication.

## Config

| Field        | Type     | Required | Description                                                                                   |
|--------------|----------|----------|-----------------------------------------------------------------------------------------------|
| `apiKey`     | `string` | Yes      | Mailgun API key                                                                               |
| `domain`     | `string` | Yes      | Sending domain (e.g., `mg.example.com`)                                                       |
| `from`       | `string` | Yes      | Default sender email                                                                          |
| `senderName` | `string` | No       | Default sender display name                                                                   |
| `username`   | `string` | No       | Basic auth username (defaults to `'api'`)                                                     |
| `baseUrl`    | `string` | No       | API base URL (defaults to `https://api.mailgun.net`, use `https://api.eu.mailgun.net` for EU) |

## Features

### Attachments

When attachments are present, the connector builds a `multipart/form-data` body. Without attachments, it uses `application/x-www-form-urlencoded`.

### Reply-To

The `replyTo` option is mapped to the Mailgun `h:Reply-To` header field (bypasses casing transform).

### EU Region

Set `baseUrl: 'https://api.eu.mailgun.net'` for EU-hosted Mailgun accounts.

### Passthrough

Use `_passthrough.body` for Mailgun-specific fields. Note: Mailgun options use prefixed keys (`o:tracking`, `h:X-Custom`, `v:my-var`) — pass these via `_passthrough.body` to bypass the casing transform.

## API

- **Endpoint:** `POST https://api.mailgun.net/v3/{domain}/messages`
- **Auth:** HTTP Basic (`api:{apiKey}`)
- **Format:** `application/x-www-form-urlencoded` (or `multipart/form-data` with attachments)
- **Provider ID:** `mailgun` (matches `EmailProviderIdEnum.Mailgun`)
