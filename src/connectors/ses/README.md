# SES Email Connector

AWS SES v2 email connector using direct HTTP calls with AWS Signature V4 authentication.

## Config

| Field                  | Type     | Required | Description                      |
|------------------------|----------|----------|----------------------------------|
| `region`               | `string` | Yes      | AWS region (e.g., `'us-east-1'`) |
| `accessKeyId`          | `string` | Yes      | AWS access key ID                |
| `secretAccessKey`      | `string` | Yes      | AWS secret access key            |
| `from`                 | `string` | Yes      | Default sender email             |
| `senderName`           | `string` | Yes      | Default sender display name      |
| `configurationSetName` | `string` | No       | SES configuration set name       |

## Features

### Attachments

When `options.attachments` is provided, the connector builds a raw MIME message with `Content.Raw.Data` instead of using `Content.Simple`. Attachments support inline content IDs (`cid`) for embedded images.

### CC / BCC

Pass `cc` and `bcc` arrays in the email options:

```typescript
await ses.sendMessage({
  to: ['recipient@example.com'],
  subject: 'Hello',
  html: '<p>Hello</p>',
  cc: ['cc@example.com'],
  bcc: ['bcc@example.com'],
});
```

### Check Integration

`checkIntegration()` sends a test email and returns a structured result:

```typescript
const result = await ses.checkIntegration({
  to: ['test@example.com'],
  subject: 'Integration Test',
  html: '<p>Test</p>',
});
// { success: true, message: 'Integration successful', code: 'SUCCESS' }
```

Returns `BAD_CREDENTIALS` code for 401/403 errors.

### Passthrough

Use `_passthrough.body` to add fields like `FeedbackForwardingEmailAddress` or `ConfigurationSetName` directly to the SES API request body.

## API

- **Endpoint:** `POST https://email.{region}.amazonaws.com/v2/email/outbound-emails`
- **Auth:** AWS Signature V4 via `aws4`
- **Provider ID:** `ses` (matches `EmailProviderIdEnum.SES`)
